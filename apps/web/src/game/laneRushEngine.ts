import type { SessionQuestion } from "../types";

export const LANE_COUNT = 4;
export const GATE_TRAVEL_MS = 6000;
export const COUNTDOWN_MS = 3000;

export type LaneRushPhase = "idle" | "countdown" | "running" | "paused" | "finished";

export interface Gate {
  question: SessionQuestion;
  progress: number; // 0 (spawn) -> 1 (reaches the car)
}

export interface PendingResolution {
  sessionQuestionId: number;
  chosenAnswerId: number;
}

export interface AnswerRecord {
  sessionQuestionId: number;
  chosenAnswerId: number;
}

export interface LaneRushState {
  phase: LaneRushPhase;
  carLane: number;
  queue: SessionQuestion[];
  currentGate: Gate | null;
  pendingResolution: PendingResolution | null;
  score: number;
  answers: AnswerRecord[];
  countdownMs: number;
  // Answer ids ruled out by a hint for the current gate's question only —
  // reset every time a new gate spawns (see spawnNextGate).
  eliminatedAnswerIds: number[];
}

export function createGameState(questions: SessionQuestion[]): LaneRushState {
  const [first, ...rest] = questions;
  return {
    phase: "idle",
    carLane: Math.floor(LANE_COUNT / 2),
    queue: rest,
    currentGate: first ? { question: first, progress: 0 } : null,
    pendingResolution: null,
    score: 0,
    answers: [],
    countdownMs: COUNTDOWN_MS,
    eliminatedAnswerIds: [],
  };
}

export function start(state: LaneRushState): LaneRushState {
  return state.phase === "idle" ? { ...state, phase: "countdown", countdownMs: COUNTDOWN_MS } : state;
}

/** Freezes gate movement and lane input — everything `update`/`shiftLane`
 * already gate on `phase === "running"`, so entering any other phase
 * (this one included) pauses them for free. No-op outside "running"
 * (can't pause a countdown or an already-finished race). */
export function pause(state: LaneRushState): LaneRushState {
  return state.phase === "running" ? { ...state, phase: "paused" } : state;
}

export function resume(state: LaneRushState): LaneRushState {
  return state.phase === "paused" ? { ...state, phase: "running" } : state;
}

/** Record which 2 answer ids a hint ruled out for the current gate. */
export function applyHint(state: LaneRushState, eliminatedAnswerIds: number[]): LaneRushState {
  return { ...state, eliminatedAnswerIds };
}

/** Advance the race by `dtMs` of wall-clock time. Pure — returns a new
 * state, never mutates. Gate movement freezes while a pendingResolution
 * is awaiting the server's verdict, so the car can't "beat" the network. */
export function update(state: LaneRushState, dtMs: number): LaneRushState {
  if (state.phase === "countdown") {
    const countdownMs = state.countdownMs - dtMs;
    return countdownMs <= 0
      ? { ...state, phase: "running", countdownMs: 0 }
      : { ...state, countdownMs };
  }

  if (state.phase !== "running" || !state.currentGate || state.pendingResolution) {
    return state;
  }

  const progress = state.currentGate.progress + dtMs / GATE_TRAVEL_MS;

  if (progress >= 1) {
    return {
      ...state,
      currentGate: { ...state.currentGate, progress: 1 },
      pendingResolution: {
        sessionQuestionId: state.currentGate.question.session_question_id,
        chosenAnswerId: state.currentGate.question.choices[state.carLane].id,
      },
    };
  }

  return { ...state, currentGate: { ...state.currentGate, progress } };
}

/** Shift the car left (-1) or right (+1) by one lane. No-op while not
 * running, or while waiting on a pending answer verdict. */
export function shiftLane(state: LaneRushState, direction: -1 | 1): LaneRushState {
  if (state.phase !== "running" || state.pendingResolution) {
    return state;
  }
  const carLane = Math.max(0, Math.min(LANE_COUNT - 1, state.carLane + direction));
  return { ...state, carLane };
}

function spawnNextGate(state: LaneRushState): LaneRushState {
  const [next, ...rest] = state.queue;
  if (!next) {
    return { ...state, currentGate: null, queue: [], phase: "finished", eliminatedAnswerIds: [] };
  }
  return { ...state, currentGate: { question: next, progress: 0 }, queue: rest, eliminatedAnswerIds: [] };
}

/** Apply the server's verdict for the pending gate: record the answer,
 * update the score, and move on to the next gate (or finish the race). */
export function applyAnswerResult(state: LaneRushState, correct: boolean): LaneRushState {
  if (!state.pendingResolution) {
    return state;
  }
  const answers = [...state.answers, state.pendingResolution];
  const score = correct ? state.score + 1 : state.score;
  return spawnNextGate({ ...state, answers, score, pendingResolution: null });
}

/** End the race early. A gate still in flight is simply dropped (never
 * answered). But if the car had already crossed into a lane and was only
 * waiting on the server's verdict, that answer is real — keep it in the
 * log so the session-complete call still gets credit for it. */
export function stop(state: LaneRushState): LaneRushState {
  const answers = state.pendingResolution ? [...state.answers, state.pendingResolution] : state.answers;
  return { ...state, phase: "finished", currentGate: null, queue: [], pendingResolution: null, answers };
}
