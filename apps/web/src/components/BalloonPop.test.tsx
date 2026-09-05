import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BalloonPop } from "./BalloonPop";
import { api } from "../api";
import type { QuizSession } from "../types";

const emittedHandlers: Record<string, (payload?: unknown) => void> = {};
const applyServerVerdictMock = vi.fn();
const popByIndexMock = vi.fn();
const destroyMock = vi.fn();
const startFullscreenMock = vi.fn();
const stopFullscreenMock = vi.fn();

vi.mock("../game/BalloonPopScene", () => ({
  BALLOON_POP_EVENTS: { ANSWER_LOCKED: "answer-locked", GAME_FINISHED: "game-finished" },
  CANVAS_WIDTH: 320,
  CANVAS_HEIGHT: 560,
  BalloonPopScene: class {
    applyServerVerdict = applyServerVerdictMock;
    popByIndex = popByIndexMock;
  },
}));

// Mirrors real Phaser's actual timing: scenes are added/booted
// asynchronously, so `scene.getScene(...)` only resolves to an instance
// once `add()` has run — but listeners the component attaches live on
// the game-level `events` bus, which this fake makes available
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

describe("BalloonPop", () => {
  beforeEach(() => {
    for (const key of Object.keys(emittedHandlers)) delete emittedHandlers[key];
    applyServerVerdictMock.mockClear();
    popByIndexMock.mockClear();
    destroyMock.mockClear();
    startFullscreenMock.mockClear();
  });

  afterEach(cleanup);

  it("registers listeners for both scene events on mount", () => {
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    expect(typeof emittedHandlers["answer-locked"]).toBe("function");
    expect(typeof emittedHandlers["game-finished"]).toBe("function");
  });

  it("submits the answer and applies the server verdict when a balloon pops", async () => {
    vi.spyOn(api, "submitAnswer").mockResolvedValue({
      is_correct: true,
      correct_answer_id: 2,
      explanation: null,
      xp_earned: 10,
    });

    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    emittedHandlers["answer-locked"]({ sessionQuestionId: 10, chosenAnswerId: 2 });

    await waitFor(() => expect(applyServerVerdictMock).toHaveBeenCalledWith(true));
    expect(api.submitAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 1, sessionQuestionId: 10, selectedAnswerId: 2 })
    );
  });

  it("completes the session and calls onComplete when the game finishes", async () => {
    const completeResult = {
      session_id: 1, score: 1, total_questions: 1, xp_earned: 10, total_xp: 10, level: 1, streak: 1,
    };
    vi.spyOn(api, "completeQuizSession").mockResolvedValue(completeResult);
    const onComplete = vi.fn();

    render(<BalloonPop session={session} onComplete={onComplete} />);
    emittedHandlers["game-finished"]();

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(completeResult));
    expect(api.completeQuizSession).toHaveBeenCalledWith(1);
  });

  it("wires the numbered touch buttons to the scene's popByIndex", () => {
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Pop balloon 3"));
    expect(popByIndexMock).toHaveBeenCalledWith(2);
  });

  it("destroys the Phaser game on unmount", () => {
    const { unmount } = render(<BalloonPop session={session} onComplete={vi.fn()} />);
    unmount();
    expect(destroyMock).toHaveBeenCalled();
  });

  it("toggles full screen via the game's scale manager", () => {
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Full screen"));
    expect(startFullscreenMock).toHaveBeenCalledTimes(1);
  });
});
