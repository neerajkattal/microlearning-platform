import type { SessionQuestion } from "../types";

export const BALLOON_COUNT = 4;
export const COUNTDOWN_MS = 3000;

export type BalloonPopPhase = "idle" | "countdown" | "running" | "paused" | "finished";

export interface PendingResolution {
  sessionQuestionId: number;
  chosenAnswerId: number;
}

export interface AnswerRecord {
  sessionQuestionId: number;
  chosenAnswerId: number;
}

export interface BalloonPopState {
  phase: BalloonPopPhase;
  queue: SessionQuestion[];
  currentQuestion: SessionQuestion | null;
  pendingResolution: PendingResolution | null;
  poppedBalloonIndex: number | null;
  score: number;
  answers: AnswerRecord[];
  countdownMs: number;
  // Answer ids ruled out by a hint for the current question only — reset
  // every time a new question spawns (see spawnNextQuestion).
  eliminatedAnswerIds: number[];
}

export function createGameState(questions: SessionQuestion[]): BalloonPopState {
  const [first, ...rest] = questions;
  return {
    phase: "idle",
    queue: rest,
    currentQuestion: first ?? null,
    pendingResolution: null,
    poppedBalloonIndex: null,
    score: 0,
    answers: [],
    countdownMs: COUNTDOWN_MS,
    eliminatedAnswerIds: [],
  };
}

export function start(state: BalloonPopState): BalloonPopState {
  return state.phase === "idle" ? { ...state, phase: "countdown", countdownMs: COUNTDOWN_MS } : state;
}

/** Freezes balloon popping — `popBalloon` already only works while
 * `phase === "running"`, so entering any other phase (this one included)
 * blocks it for free. No-op outside "running". */
export function pause(state: BalloonPopState): BalloonPopState {
  return state.phase === "running" ? { ...state, phase: "paused" } : state;
}

export function resume(state: BalloonPopState): BalloonPopState {
  return state.phase === "paused" ? { ...state, phase: "running" } : state;
}

/** Record which 2 answer ids a hint ruled out for the current question. */
export function applyHint(state: BalloonPopState, eliminatedAnswerIds: number[]): BalloonPopState {
  return { ...state, eliminatedAnswerIds };
}

/** Advance the countdown by `dtMs` of wall-clock time. Unlike Lane Rush's
 * gates, balloons don't travel — there's nothing else for time to move
 * once the round is running, so this only ever drives the countdown. */
export function update(state: BalloonPopState, dtMs: number): BalloonPopState {
  if (state.phase !== "countdown") {
    return state;
  }
  const countdownMs = state.countdownMs - dtMs;
  return countdownMs <= 0
    ? { ...state, phase: "running", countdownMs: 0 }
    : { ...state, countdownMs };
}

/** Pop the balloon at `balloonIndex` (0-based, matching the answer choice
 * at that index). No-op if the round isn't running, a choice is already
 * locked in awaiting a server verdict, or the index has no choice behind
 * it (defensive — the scene should never call this with an out-of-range
 * index, since it only renders BALLOON_COUNT balloons). */
export function popBalloon(state: BalloonPopState, balloonIndex: number): BalloonPopState {
  if (state.phase !== "running" || state.pendingResolution || !state.currentQuestion) {
    return state;
  }
  const choice = state.currentQuestion.choices[balloonIndex];
  if (!choice) {
    return state;
  }
  return {
    ...state,
    poppedBalloonIndex: balloonIndex,
    pendingResolution: {
      sessionQuestionId: state.currentQuestion.session_question_id,
      chosenAnswerId: choice.id,
    },
  };
}

function spawnNextQuestion(state: BalloonPopState): BalloonPopState {
  const [next, ...rest] = state.queue;
  if (!next) {
    return { ...state, currentQuestion: null, queue: [], phase: "finished", eliminatedAnswerIds: [] };
  }
  return { ...state, currentQuestion: next, queue: rest, poppedBalloonIndex: null, eliminatedAnswerIds: [] };
}

/** Apply the server's verdict for the popped balloon: record the answer,
 * update the score, and move on to the next question (or finish). */
export function applyAnswerResult(state: BalloonPopState, correct: boolean): BalloonPopState {
  if (!state.pendingResolution) {
    return state;
  }
  const answers = [...state.answers, state.pendingResolution];
  const score = correct ? state.score + 1 : state.score;
  return spawnNextQuestion({ ...state, answers, score, pendingResolution: null });
}

/** End the round early. A popped balloon still awaiting a server verdict
 * counts as a real answer (same reasoning as Lane Rush's stop()) — it
 * was a genuine locked-in choice, just not confirmed yet. */
export function stop(state: BalloonPopState): BalloonPopState {
  const answers = state.pendingResolution ? [...state.answers, state.pendingResolution] : state.answers;
  return { ...state, phase: "finished", currentQuestion: null, queue: [], pendingResolution: null, answers };
}
