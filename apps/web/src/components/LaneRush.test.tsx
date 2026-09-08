import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LaneRush } from "./LaneRush";
import { api } from "../api";
import type { QuizSession } from "../types";

const emittedHandlers: Record<string, (payload?: unknown) => void> = {};
const applyServerVerdictMock = vi.fn();
const pressLeftMock = vi.fn();
const pressRightMock = vi.fn();
const destroyMock = vi.fn();
const startFullscreenMock = vi.fn();
const stopFullscreenMock = vi.fn();

vi.mock("../game/LaneRushScene", () => ({
  LANE_RUSH_EVENTS: { ANSWER_LOCKED: "answer-locked", RACE_FINISHED: "race-finished" },
  CANVAS_WIDTH: 300,
  CANVAS_HEIGHT: 450,
  LaneRushScene: class {
    applyServerVerdict = applyServerVerdictMock;
    pressLeft = pressLeftMock;
    pressRight = pressRightMock;
  },
}));

// Mirrors real Phaser's actual (surprising) timing: scenes are added/
// booted asynchronously, so `scene.getScene(...)` only resolves to an
// instance once `add()` has run — but listeners the component attaches
// live on the game-level `events` bus, which this fake makes available
// synchronously, same as the real Phaser.Game constructor does.
vi.mock("phaser", () => {
  class FakeGame {
    events = {
      on: (event: string, cb: (payload?: unknown) => void) => {
        emittedHandlers[event] = cb;
      },
    };
    scene: { add: (key: string, SceneClass: new () => unknown) => void; getScene: () => unknown };
    scale = {
      fullscreen: { available: true },
      isFullscreen: false,
      on: vi.fn(),
      startFullscreen: startFullscreenMock,
      stopFullscreen: stopFullscreenMock,
    };
    private instance: unknown;
    constructor() {
      this.scene = {
        add: (_key: string, SceneClass: new () => unknown) => {
          this.instance = new SceneClass();
        },
        getScene: () => this.instance,
      };
    }
    destroy() {
      destroyMock();
    }
  }
  return {
    default: {
      Game: FakeGame,
      AUTO: 0,
      Scale: {
        FIT: 1,
        CENTER_BOTH: 1,
        Events: { ENTER_FULLSCREEN: "enterfullscreen", LEAVE_FULLSCREEN: "leavefullscreen" },
      },
    },
  };
});

const session: QuizSession = {
  id: 1,
  status: "in_progress",
  questions: [
    {
      session_question_id: 10,
      question_id: 100,
      prompt: "2 + 2?",
      difficulty: "easy",
      choices: [
        { id: 1, text: "3" },
        { id: 2, text: "4" },
      ],
    },
  ],
};

describe("LaneRush", () => {
  beforeEach(() => {
    for (const key of Object.keys(emittedHandlers)) delete emittedHandlers[key];
    applyServerVerdictMock.mockClear();
    pressLeftMock.mockClear();
    pressRightMock.mockClear();
    destroyMock.mockClear();
  });

  afterEach(cleanup);

  it("registers listeners for both scene events on mount", () => {
    render(<LaneRush session={session} onComplete={vi.fn()} />);
    expect(typeof emittedHandlers["answer-locked"]).toBe("function");
    expect(typeof emittedHandlers["race-finished"]).toBe("function");
  });

  it("submits the answer and applies the server verdict when a gate locks in", async () => {
    vi.spyOn(api, "submitAnswer").mockResolvedValue({
      is_correct: true,
      correct_answer_id: 2,
      explanation: null,
      xp_earned: 10,
    });

    render(<LaneRush session={session} onComplete={vi.fn()} />);
    emittedHandlers["answer-locked"]({ sessionQuestionId: 10, chosenAnswerId: 2 });

    await waitFor(() => expect(applyServerVerdictMock).toHaveBeenCalledWith(true));
    expect(api.submitAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 1, sessionQuestionId: 10, selectedAnswerId: 2 })
    );
  });

  it("completes the session and calls onComplete when the race finishes", async () => {
    const completeResult = {
      session_id: 1, score: 1, total_questions: 1, xp_earned: 10, total_xp: 10, level: 1, streak: 1, achievements_earned: [],
    };
    vi.spyOn(api, "completeQuizSession").mockResolvedValue(completeResult);
    const onComplete = vi.fn();

    render(<LaneRush session={session} onComplete={onComplete} />);
    emittedHandlers["race-finished"]();

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(completeResult));
    expect(api.completeQuizSession).toHaveBeenCalledWith(1);
  });

  it("wires the touch controls to the scene's pressLeft/pressRight", () => {
    render(<LaneRush session={session} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Move left"));
    fireEvent.click(screen.getByLabelText("Move right"));
    expect(pressLeftMock).toHaveBeenCalledTimes(1);
    expect(pressRightMock).toHaveBeenCalledTimes(1);
  });

  it("destroys the Phaser game on unmount", () => {
    const { unmount } = render(<LaneRush session={session} onComplete={vi.fn()} />);
    unmount();
    expect(destroyMock).toHaveBeenCalled();
  });

  it("toggles full screen via the game's scale manager", () => {
    render(<LaneRush session={session} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Full screen"));
    expect(startFullscreenMock).toHaveBeenCalledTimes(1);
  });
});
