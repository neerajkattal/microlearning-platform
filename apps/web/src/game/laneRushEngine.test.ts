import { describe, expect, it } from "vitest";
import {
  GATE_TRAVEL_MS,
  LANE_COUNT,
  applyAnswerResult,
  createGameState,
  shiftLane,
  start,
  stop,
  update,
} from "./laneRushEngine";
import type { LaneRushState } from "./laneRushEngine";
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
  it("spawns the first question as the current gate and queues the rest", () => {
    const state = createGameState(QUESTIONS);
    expect(state.currentGate?.question.session_question_id).toBe(1);
    expect(state.queue.map((q) => q.session_question_id)).toEqual([2]);
  });

  it("starts idle, centered lane, empty answers", () => {
    const state = createGameState(QUESTIONS);
    expect(state.phase).toBe("idle");
    expect(state.carLane).toBe(Math.floor(LANE_COUNT / 2));
    expect(state.answers).toEqual([]);
    expect(state.score).toBe(0);
  });
});

describe("start", () => {
  it("moves from idle to countdown", () => {
    const state = start(createGameState(QUESTIONS));
    expect(state.phase).toBe("countdown");
  });

  it("does nothing if already past idle", () => {
    let state = start(createGameState(QUESTIONS));
    const afterFirstStart = state;
    state = start(state);
    expect(state).toEqual(afterFirstStart);
  });
});

describe("shiftLane", () => {
  function runningState(): LaneRushState {
    return { ...createGameState(QUESTIONS), phase: "running" };
  }

  it("never moves the car below lane 0", () => {
    let state = { ...runningState(), carLane: 0 };
    state = shiftLane(state, -1);
    expect(state.carLane).toBe(0);
  });

  it("never moves the car past the last lane", () => {
    let state = { ...runningState(), carLane: LANE_COUNT - 1 };
    state = shiftLane(state, 1);
    expect(state.carLane).toBe(LANE_COUNT - 1);
  });

  it("does nothing while a gate answer is pending", () => {
    let state: LaneRushState = {
      ...runningState(),
      carLane: 1,
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: 2 },
    };
    state = shiftLane(state, 1);
    expect(state.carLane).toBe(1);
  });

  it("does nothing before the race has started", () => {
    let state = { ...createGameState(QUESTIONS), carLane: 1 };
    state = shiftLane(state, 1);
    expect(state.carLane).toBe(1);
  });
});

describe("update", () => {
  it("counts down then switches to running", () => {
    let state = start(createGameState(QUESTIONS));
    state = update(state, 3000);
    expect(state.phase).toBe("running");
    expect(state.countdownMs).toBe(0);
  });

  it("advances gate progress toward the car", () => {
    let state: LaneRushState = { ...createGameState(QUESTIONS), phase: "running" };
    state = update(state, GATE_TRAVEL_MS / 2);
    expect(state.currentGate?.progress).toBeCloseTo(0.5);
  });

  it("sets pendingResolution using the car's current lane once the gate arrives", () => {
    let state: LaneRushState = { ...createGameState(QUESTIONS), phase: "running", carLane: 2 };
    state = update(state, GATE_TRAVEL_MS);
    expect(state.pendingResolution).toEqual({
      sessionQuestionId: 1,
      chosenAnswerId: QUESTIONS[0].choices[2].id,
    });
  });

  it("freezes gate movement while a resolution is pending", () => {
    let state: LaneRushState = { ...createGameState(QUESTIONS), phase: "running" };
    state = update(state, GATE_TRAVEL_MS);
    const frozenProgress = state.currentGate?.progress;
    state = update(state, 500);
    expect(state.currentGate?.progress).toBe(frozenProgress);
  });
});

describe("applyAnswerResult", () => {
  it("increments score and spawns the next gate on a correct answer", () => {
    let state: LaneRushState = {
      ...createGameState(QUESTIONS),
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: QUESTIONS[0].choices[0].id },
    };
    state = applyAnswerResult(state, true);
    expect(state.score).toBe(1);
    expect(state.currentGate?.question.session_question_id).toBe(2);
    expect(state.answers).toEqual([{ sessionQuestionId: 1, chosenAnswerId: QUESTIONS[0].choices[0].id }]);
  });

  it("does not increment score on a wrong answer, but still records it and advances", () => {
    let state: LaneRushState = {
      ...createGameState(QUESTIONS),
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: QUESTIONS[0].choices[3].id },
    };
    state = applyAnswerResult(state, false);
    expect(state.score).toBe(0);
    expect(state.answers).toHaveLength(1);
  });

  it("finishes the race once the last gate is answered", () => {
    let state: LaneRushState = {
      ...createGameState([QUESTIONS[0]]),
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: QUESTIONS[0].choices[0].id },
    };
    state = applyAnswerResult(state, true);
    expect(state.phase).toBe("finished");
    expect(state.currentGate).toBeNull();
  });

  it("does nothing if there's no pending resolution", () => {
    const state = createGameState(QUESTIONS);
    expect(applyAnswerResult(state, true)).toEqual(state);
  });
});

describe("stop", () => {
  it("finishes the race and clears the queue", () => {
    const state: LaneRushState = { ...createGameState(QUESTIONS), phase: "running" };
    const stopped = stop(state);
    expect(stopped.phase).toBe("finished");
    expect(stopped.queue).toEqual([]);
    expect(stopped.currentGate).toBeNull();
  });

  it("preserves a locked-in answer that was awaiting a server verdict when stopped", () => {
    const state: LaneRushState = {
      ...createGameState(QUESTIONS),
      phase: "running",
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: 2 },
    };
    const stopped = stop(state);
    expect(stopped.answers).toContainEqual({ sessionQuestionId: 1, chosenAnswerId: 2 });
  });
});
