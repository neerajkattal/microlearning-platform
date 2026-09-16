import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
const pauseGameMock = vi.fn();
const resumeGameMock = vi.fn();
const applyHintMock = vi.fn();
const stopGameMock = vi.fn();
let scenePaused = false;
let sceneCurrentSessionQuestionId: number | null = 10;

vi.mock("../game/BalloonPopScene", () => ({
  BALLOON_POP_EVENTS: {
    ANSWER_LOCKED: "answer-locked",
    GAME_FINISHED: "game-finished",
    QUESTION_CHANGED: "question-changed",
  },
  CANVAS_WIDTH: 320,
  CANVAS_HEIGHT: 560,
  BalloonPopScene: class {
    applyServerVerdict = applyServerVerdictMock;
    popByIndex = popByIndexMock;
    pauseGame = () => {
      scenePaused = true;
      pauseGameMock();
    };
    resumeGame = () => {
      scenePaused = false;
      resumeGameMock();
    };
    isPaused = () => scenePaused;
    getCurrentSessionQuestionId = () => sceneCurrentSessionQuestionId;
    applyHint = applyHintMock;
    stopGame = stopGameMock;
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
    pauseGameMock.mockClear();
    resumeGameMock.mockClear();
    applyHintMock.mockClear();
    stopGameMock.mockClear();
    scenePaused = false;
    sceneCurrentSessionQuestionId = 10;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

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
      session_id: 1, score: 1, total_questions: 1, xp_earned: 10, total_xp: 10, level: 1, streak: 1, achievements_earned: [], review: [],
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

  it("pauses the scene and shows a resume overlay, then resumes on click", () => {
    render(<BalloonPop session={session} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Pause"));
    expect(pauseGameMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Paused")).toBeTruthy();

    fireEvent.click(screen.getByText("Resume"));
    expect(resumeGameMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Paused")).toBeNull();
  });

  it("disables the balloon touch buttons while paused", () => {
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Pause"));
    expect((screen.getByLabelText("Pop balloon 1") as HTMLButtonElement).disabled).toBe(true);
  });

  it("fetches a hint for the current question and applies it to the scene", async () => {
    vi.spyOn(api, "getHint").mockResolvedValue({ eliminated_answer_ids: [1] });
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    act(() => emittedHandlers["question-changed"](10));

    fireEvent.click(screen.getByLabelText("Get a hint"));

    await waitFor(() => expect(applyHintMock).toHaveBeenCalledWith([1]));
    expect(api.getHint).toHaveBeenCalledWith({ sessionId: 1, sessionQuestionId: 10 });
  });

  it("disables the hint button once a hint has been used for the current question", async () => {
    vi.spyOn(api, "getHint").mockResolvedValue({ eliminated_answer_ids: [1] });
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    act(() => emittedHandlers["question-changed"](10));

    fireEvent.click(screen.getByLabelText("Get a hint"));
    await waitFor(() => expect((screen.getByLabelText("Get a hint") as HTMLButtonElement).disabled).toBe(true));

    expect(api.getHint).toHaveBeenCalledTimes(1);
  });

  it("re-enables the hint button once a new question spawns", async () => {
    vi.spyOn(api, "getHint").mockResolvedValue({ eliminated_answer_ids: [1] });
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    act(() => emittedHandlers["question-changed"](10));

    fireEvent.click(screen.getByLabelText("Get a hint"));
    await waitFor(() => expect((screen.getByLabelText("Get a hint") as HTMLButtonElement).disabled).toBe(true));

    act(() => emittedHandlers["question-changed"](11));
    expect((screen.getByLabelText("Get a hint") as HTMLButtonElement).disabled).toBe(false);
  });

  it("stops the round when Stop is clicked and confirmed via the in-app message", () => {
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Stop"));
    expect(screen.getByRole("alert").textContent).toContain("Stop this quiz?");
    fireEvent.click(screen.getByText("Yes, stop"));
    expect(stopGameMock).toHaveBeenCalledTimes(1);
  });

  it("does not stop the round if the in-app confirmation is declined", () => {
    render(<BalloonPop session={session} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Stop"));
    fireEvent.click(screen.getByText("Keep playing"));
    expect(stopGameMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("pauses on Space and resumes on Space again", () => {
    render(<BalloonPop session={session} onComplete={vi.fn()} />);

    fireEvent.keyDown(window, { code: "Space" });
    expect(pauseGameMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Paused")).toBeTruthy();

    fireEvent.keyDown(window, { code: "Space" });
    expect(resumeGameMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Paused")).toBeNull();
  });
});
