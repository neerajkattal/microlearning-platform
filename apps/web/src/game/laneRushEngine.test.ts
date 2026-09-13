import { describe, expect, it } from "vitest";
import {
  GATE_TRAVEL_MS,
  LANE_COUNT,
  applyAnswerResult,
  applyHint,
  createGameState,
  pause,
  resume,
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

describe("pause/resume", () => {
  it("pauses a running race", () => {
    const state: LaneRushState = { ...createGameState(QUESTIONS), phase: "running" };
    expect(pause(state).phase).toBe("paused");
  });

  it("does nothing if not running (e.g. still in countdown)", () => {
    const state = start(createGameState(QUESTIONS)); // countdown
    expect(pause(state)).toEqual(state);
  });

  it("freezes gate progress while paused", () => {
    let state: LaneRushState = { ...createGameState(QUESTIONS), phase: "running" };
    state = pause(state);
    const before = state.currentGate?.progress;
    state = update(state, 1000);
    expect(state.currentGate?.progress).toBe(before);
  });

  it("blocks lane changes while paused", () => {
    let state: LaneRushState = { ...createGameState(QUESTIONS), phase: "running" };
    state = pause(state);
    const before = state.carLane;
    state = shiftLane(state, 1);
    expect(state.carLane).toBe(before);
  });

  it("resumes a paused race back to running", () => {
    const state: LaneRushState = { ...createGameState(QUESTIONS), phase: "paused" };
    expect(resume(state).phase).toBe("running");
  });

  it("resume does nothing if not paused", () => {
    const state: LaneRushState = { ...createGameState(QUESTIONS), phase: "running" };
    expect(resume(state)).toEqual(state);
  });
});

describe("applyHint", () => {
  it("records the eliminated answer ids", () => {
    const state = createGameState(QUESTIONS);
    expect(applyHint(state, [1, 3]).eliminatedAnswerIds).toEqual([1, 3]);
  });

  it("is cleared when the next gate spawns", () => {
    let state: LaneRushState = {
      ...createGameState(QUESTIONS),
      phase: "running",
      eliminatedAnswerIds: [1, 3],
      pendingResolution: { sessionQuestionId: 1, chosenAnswerId: 2 },
    };
    state = applyAnswerResult(state, true);
    expect(state.eliminatedAnswerIds).toEqual([]);
  });
});
