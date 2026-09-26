/**
 * The interface any game (Lane Rush, Balloon Pop, future ones) implements
 * to plug into the shared quiz session flow. Per ENGINEERING.md's game/quiz
 * boundary: games own rendering/input/animation/local state; they never
 * decide correctness themselves, they just report what the player picked
 * and render whatever result the server sends back.
 */

import type { AnswerAttemptResult, QuizSessionQuestionView } from "@microlearning/shared-types";

// The host app's callbacks into a running game — a game calls these to
// tell the host what happened; it never calls itself.
export interface GameSessionHandle {
  /** Called by the host app when the next question is ready to play. */
  presentQuestion(question: QuizSessionQuestionView): void;
  /** Called once the server has scored the player's most recent attempt. */
  onAnswerResult(result: AnswerAttemptResult): void;
  /** Called when the quiz session has no more questions. */
  onSessionComplete(): void;
}

// A pluggable game's own side of the contract: mount/unmount into a DOM
// container, identified by a stable id and a display name.
export interface GameAdapter {
  readonly id: string;
  readonly displayName: string;
  mount(container: HTMLElement, handle: GameSessionHandle): void;
  unmount(): void;
}
