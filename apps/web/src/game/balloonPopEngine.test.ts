import { describe, expect, it } from "vitest";
import {
  COUNTDOWN_MS,
  applyAnswerResult,
  createGameState,
  popBalloon,
  start,
  stop,
  update,
} from "./balloonPopEngine";
import type { BalloonPopState } from "./balloonPopEngine";
import type { SessionQuestion } from "../types";

const QUESTIONS: SessionQuestion[] = [
  {
    session_question_id: 1,
    question_id: 100,
    prompt: "Q1",
    difficulty: "easy",
    choices: [
      { id: 1, text: "a" },
      { id: 2, text: "b" },
      { id: 3, text: "c" },
      { id: 4, text: "d" },
    ],
  },
  {
    session_question_id: 2,
    question_id: 101,
    prompt: "Q2",
    difficulty: "easy",
    choices: [
      { id: 5, text: "a" },
      { id: 6, text: "b" },
      { id: 7, text: "c" },
      { id: 8, text: "d" },
    ],
  },
];

describe("createGameState", () => {
  it("starts on the first question with the rest queued", () => {
    const state = createGameState(QUESTIONS);
    expect(state.currentQuestion?.session_question_id).toBe(1);
    expect(state.queue.map((q) => q.session_question_id)).toEqual([2]);
  });

  it("starts idle, no balloon popped, empty answers", () => {
    const state = createGameState(QUESTIONS);
    expect(state.phase).toBe("idle");
    expect(state.poppedBalloonIndex).toBeNull();
    expect(state.answers).toEqual([]);
    expect(state.score).toBe(0);
  });
});

describe("start", () => {
  it("moves from idle to countdown", () => {
    const state = start(createGameState(QUESTIONS));
    expect(state.phase).toBe("countdown");
    expect(state.countdownMs).toBe(COUNTDOWN_MS);
  });

  it("does nothing if already past idle", () => {
    let state = start(createGameState(QUESTIONS));
    const afterFirstStart = state;
    state = start(state);
    expect(state).toEqual(afterFirstStart);
  });
});

describe("update", () => {
  it("counts down then switches to running", () => {
    let state = start(createGameState(QUESTIONS));
    state = update(state, COUNTDOWN_MS);
    expect(state.phase).toBe("running");
    expect(state.countdownMs).toBe(0);
  });

  it("does nothing once running", () => {
    let state: BalloonPopState = { ...createGameState(QUESTIONS), phase: "running" };
    const before = state;
    state = update(state, 500);
    expect(state).toEqual(before);
  });
});

describe("popBalloon", () => {
  function runningState(): BalloonPopState {
    return { ...createGameState(QUESTIONS), phase: "running" };
  }

  it("locks in the answer at the given balloon index", () => {
    const state = popBalloon(runningState(), 2);
    expect(state.pendingResolution).toEqual({ sessionQuestionId: 1, chosenAnswerId: 3 });
    expect(state.poppedBalloonIndex).toBe(2);
  });

  it("does nothing before the round has started", () => {
    const state = popBalloon(createGameState(QUESTIONS), 0);
    expect(state.pendingResolution).toBeNull();
  });

  it("does nothing while a pop is already pending a verdict", () => {
    const alreadyPending: BalloonPopState = {
      ...runningState(),
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: 1 },
    };
    const state = popBalloon(alreadyPending, 3);
    expect(state.pendingResolution).toEqual({ sessionQuestionId: 1, chosenAnswerId: 1 });
    expect(state.poppedBalloonIndex).toBeNull();
  });

  it("does nothing for an out-of-range balloon index", () => {
    const state = popBalloon(runningState(), 9);
    expect(state.pendingResolution).toBeNull();
  });
});

describe("applyAnswerResult", () => {
  it("increments score and advances to the next question on a correct answer", () => {
    let state: BalloonPopState = {
      ...createGameState(QUESTIONS),
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: QUESTIONS[0].choices[0].id },
    };
    state = applyAnswerResult(state, true);
    expect(state.score).toBe(1);
    expect(state.currentQuestion?.session_question_id).toBe(2);
    expect(state.poppedBalloonIndex).toBeNull();
    expect(state.answers).toEqual([{ sessionQuestionId: 1, chosenAnswerId: QUESTIONS[0].choices[0].id }]);
  });

  it("does not increment score on a wrong answer, but still records it and advances", () => {
    let state: BalloonPopState = {
      ...createGameState(QUESTIONS),
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: QUESTIONS[0].choices[3].id },
    };
    state = applyAnswerResult(state, false);
    expect(state.score).toBe(0);
    expect(state.answers).toHaveLength(1);
  });

  it("finishes the round once the last question is answered", () => {
    let state: BalloonPopState = {
      ...createGameState([QUESTIONS[0]]),
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: QUESTIONS[0].choices[0].id },
    };
    state = applyAnswerResult(state, true);
    expect(state.phase).toBe("finished");
    expect(state.currentQuestion).toBeNull();
  });

  it("does nothing if there's no pending resolution", () => {
    const state = createGameState(QUESTIONS);
    expect(applyAnswerResult(state, true)).toEqual(state);
  });
});

describe("stop", () => {
  it("finishes the round and clears the queue", () => {
    const state: BalloonPopState = { ...createGameState(QUESTIONS), phase: "running" };
    const stopped = stop(state);
    expect(stopped.phase).toBe("finished");
    expect(stopped.queue).toEqual([]);
    expect(stopped.currentQuestion).toBeNull();
  });

  it("preserves a popped balloon that was awaiting a server verdict when stopped", () => {
    const state: BalloonPopState = {
      ...createGameState(QUESTIONS),
      phase: "running",
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: 2 },
    };
    const stopped = stop(state);
    expect(stopped.answers).toContainEqual({ sessionQuestionId: 1, chosenAnswerId: 2 });
  });
});
