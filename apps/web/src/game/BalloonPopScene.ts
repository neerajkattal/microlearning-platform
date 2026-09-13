import Phaser from "phaser";
import type { SessionQuestion } from "../types";
import {
  BALLOON_COUNT,
  BalloonPopState,
  applyAnswerResult,
  applyHint,
  createGameState,
  pause as enginePause,
  popBalloon,
  resume as engineResume,
  start,
  update as engineUpdate,
} from "./balloonPopEngine";

export const CANVAS_WIDTH = 320;
export const CANVAS_HEIGHT = 560;

const BANNER_HEIGHT = 84;
const GRID_TOP = BANNER_HEIGHT + 24;
const GRID_BOTTOM = CANVAS_HEIGHT - 24;
const BALLOON_RADIUS_X = 62;
const BALLOON_RADIUS_Y = 74;

const COLUMN_COUNT = 2;
const ROW_COUNT = Math.ceil(BALLOON_COUNT / COLUMN_COUNT);
const CELL_WIDTH = CANVAS_WIDTH / COLUMN_COUNT;
const CELL_HEIGHT = (GRID_BOTTOM - GRID_TOP) / ROW_COUNT;

const BALLOON_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

const PALETTE = {
  sky: "#0b1220",
  string: "#94a3b8",
  answerText: "#0f172a",
  bannerBg: "#111827",
  bannerBorder: "#f59e0b",
  hudText: "#cbd5e1",
};

function fontSizeFor(text: string): number {
  if (text.length > 22) return 10;
  if (text.length > 14) return 12;
  return 14;
}

function questionFontSizeFor(text: string): number {
  if (text.length > 90) return 12;
  if (text.length > 55) return 14;
  return 16;
}

function balloonCenter(index: number): { x: number; y: number } {
  const col = index % COLUMN_COUNT;
  const row = Math.floor(index / COLUMN_COUNT);
  return {
    x: CELL_WIDTH * col + CELL_WIDTH / 2,
    y: GRID_TOP + CELL_HEIGHT * row + CELL_HEIGHT / 2,
  };
}

/** Events the scene emits for the React wrapper to react to. Emitted on
 * the game-level bus (`this.game.events`), not the scene's own emitter —
 * real Phaser adds/boots scenes asynchronously, so a listener attached
 * right after `new Phaser.Game(...)` would find the scene-level emitter
 * doesn't exist yet. This bit us for real in Lane Rush (see
 * docs/learning/TROUBLESHOOTING.md #9) — applying that lesson here from
 * the start instead of re-discovering it. */
export const BALLOON_POP_EVENTS = {
  ANSWER_LOCKED: "answer-locked",
  GAME_FINISHED: "game-finished",
  // Fired whenever the current question changes (a new one spawns, or the
  // round ends) - the React wrapper uses this to know a hint no longer
  // applies to whatever question is now current.
  QUESTION_CHANGED: "question-changed",
} as const;

export class BalloonPopScene extends Phaser.Scene {
  private state!: BalloonPopState;
  private questions: SessionQuestion[] = [];

  private bannerGraphics!: Phaser.GameObjects.Graphics;
  private balloonGraphics!: Phaser.GameObjects.Graphics;
  private flashGraphics!: Phaser.GameObjects.Graphics;
  private answerTexts: Phaser.GameObjects.Text[] = [];
  private numberTexts: Phaser.GameObjects.Text[] = [];
  private hitZones: Phaser.GameObjects.Zone[] = [];
  private questionText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private reducedMotion = false;
  private popScale = 1;
  private popKeys: Phaser.Input.Keyboard.Key[] = [];
  private awaitingVerdict = false;
  private finishedEmitted = false;
  private lastEmittedQuestionId: number | null = null;

  constructor() {
    super({ key: "BalloonPopScene" });
  }

  init(data: { questions: SessionQuestion[] }) {
    this.questions = data.questions;
    this.state = createGameState(this.questions);
  }

  create() {
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    this.bannerGraphics = this.add.graphics();
    this.balloonGraphics = this.add.graphics();
    this.flashGraphics = this.add.graphics().setAlpha(0);

    for (let i = 0; i < BALLOON_COUNT; i++) {
      const { x, y } = balloonCenter(i);
      this.answerTexts.push(
        this.add
          .text(x, y, "", {
            fontFamily: "system-ui, sans-serif",
            color: "#0f172a",
            fontStyle: "600",
            align: "center",
            wordWrap: { width: BALLOON_RADIUS_X * 1.6 },
          })
          .setOrigin(0.5)
      );
      this.numberTexts.push(
        this.add
          .text(x - BALLOON_RADIUS_X + 10, y - BALLOON_RADIUS_Y + 8, String(i + 1), {
            fontFamily: "system-ui, sans-serif",
            fontSize: "11px",
            color: "#0f172a",
          })
          .setOrigin(0.5)
      );

      const zone = this.add
        .zone(x, y, BALLOON_RADIUS_X * 2, BALLOON_RADIUS_Y * 2)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => this.attemptPop(i));
      this.hitZones.push(zone);
    }

    this.progressText = this.add.text(12, 10, "", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "12px",
      color: PALETTE.hudText,
    });
    this.scoreText = this.add
      .text(CANVAS_WIDTH - 12, 10, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: PALETTE.hudText,
        align: "right",
      })
      .setOrigin(1, 0);
    this.questionText = this.add
      .text(CANVAS_WIDTH / 2, 34, "", {
        fontFamily: "system-ui, sans-serif",
        fontStyle: "600",
        color: "#f9fafb",
        align: "center",
        wordWrap: { width: CANVAS_WIDTH - 32 },
      })
      .setOrigin(0.5, 0);

    this.countdownText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: "#f9fafb",
      })
      .setOrigin(0.5);
    this.feedbackText = this.add
      .text(CANVAS_WIDTH / 2, BANNER_HEIGHT + 12, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    if (this.input.keyboard) {
      this.popKeys = ["ONE", "TWO", "THREE", "FOUR"]
        .slice(0, BALLOON_COUNT)
        .map((code) => this.input.keyboard!.addKey(code));
    }

    this.state = start(this.state);
    this.render();
  }

  update(_time: number, delta: number) {
    this.handleKeyboardInput();
    this.state = engineUpdate(this.state, delta);
    this.render();

    if (this.state.pendingResolution && !this.awaitingVerdict) {
      this.awaitingVerdict = true;
      this.game.events.emit(BALLOON_POP_EVENTS.ANSWER_LOCKED, this.state.pendingResolution);
    }

    const currentQuestionId = this.state.currentQuestion?.session_question_id ?? null;
    if (currentQuestionId !== this.lastEmittedQuestionId) {
      this.lastEmittedQuestionId = currentQuestionId;
      this.game.events.emit(BALLOON_POP_EVENTS.QUESTION_CHANGED, currentQuestionId);
    }

    if (this.state.phase === "finished" && !this.finishedEmitted) {
      this.finishedEmitted = true;
      this.game.events.emit(BALLOON_POP_EVENTS.GAME_FINISHED, {
        score: this.state.score,
        totalQuestions: this.questions.length,
        answers: this.state.answers,
      });
    }
  }

  /** Called by the React wrapper once the server has answered whether the
   * popped balloon's choice was correct. The scene never decides this
   * itself. */
  applyServerVerdict(correct: boolean) {
    this.awaitingVerdict = false;
    this.state = applyAnswerResult(this.state, correct);
    this.showFeedback(correct);
  }

  /** Called from the React wrapper's on-screen buttons for players who
   * can't/don't want to tap the canvas directly — mirrors Lane Rush's
   * touch controls, just numbered instead of directional. */
  popByIndex(index: number) {
    this.attemptPop(index);
  }

  pauseGame() {
    this.state = enginePause(this.state);
  }

  resumeGame() {
    this.state = engineResume(this.state);
  }

  isPaused() {
    return this.state.phase === "paused";
  }

  getCurrentSessionQuestionId(): number | null {
    return this.state.currentQuestion?.session_question_id ?? null;
  }

  applyHint(eliminatedAnswerIds: number[]) {
    this.state = applyHint(this.state, eliminatedAnswerIds);
  }

  private attemptPop(index: number) {
    const before = this.state;
    this.state = popBalloon(this.state, index);
    if (this.state !== before && !this.reducedMotion) {
      this.popScale = 1;
      this.tweens.add({
        targets: this,
        popScale: 0,
        duration: 220,
        ease: "Back.easeIn",
      });
    }
  }

  private handleKeyboardInput() {
    this.popKeys.forEach((key, index) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.attemptPop(index);
      }
    });
  }

  /** Feedback is never color-only (CLAUDE.md "feedback that does not
   * rely on color alone") — the text says "Correct"/"Wrong" regardless.
   * The colored flash is purely decorative and skipped for players who
   * prefer reduced motion. */
  private showFeedback(correct: boolean) {
    this.feedbackText.setText(correct ? "Correct!" : "Wrong");
    this.feedbackText.setColor(correct ? "#22c55e" : "#ef4444");
    this.time.delayedCall(900, () => this.feedbackText.setText(""));

    if (this.reducedMotion) return;
    this.flashGraphics.clear();
    this.flashGraphics.fillStyle(
      Phaser.Display.Color.HexStringToColor(correct ? "#22c55e" : "#ef4444").color,
      1
    );
    this.flashGraphics.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.flashGraphics.setAlpha(0.35);
    this.tweens.add({ targets: this.flashGraphics, alpha: 0, duration: 400 });
  }

  private render() {
    this.drawSky();
    this.drawBanner();
    this.drawCountdown();
    this.drawHud();
  }

  private drawSky() {
    // A one-time-per-question-not-needed static background is cheap to
    // just redraw every frame here, same as the rest of this scene.
    const g = this.balloonGraphics;
    g.clear();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.sky).color, 1);
    g.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drawBalloonShapes();
  }

  private drawBalloonShapes() {
    const g = this.balloonGraphics;
    const question = this.state.currentQuestion;

    for (let i = 0; i < BALLOON_COUNT; i++) {
      const choice = question?.choices[i];
      const text = this.answerTexts[i];
      const numberText = this.numberTexts[i];
      const { x, y } = balloonCenter(i);
      const isPopping = this.state.poppedBalloonIndex === i;
      const isEliminated = !!choice && this.state.eliminatedAnswerIds.includes(choice.id);
      // A hint-eliminated balloon is still poppable (not physically
      // blocked), just visually marked as ruled-out - same "disabled but
      // not removed" treatment as the other two modes.
      const scale = isPopping ? this.popScale : isEliminated ? 0.7 : 1;

      text.setText(choice?.text ?? "");
      numberText.setVisible(!!choice);
      if (choice) {
        text.setFontSize(fontSizeFor(choice.text));
      }
      text.setPosition(x, y);
      text.setAlpha(isEliminated ? 0.4 : scale);
      numberText.setAlpha(isEliminated ? 0.4 : scale);

      if (!choice || scale <= 0.02) continue;

      g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.string).color, 1);
      g.fillRect(x - 1, y + BALLOON_RADIUS_Y * scale, 2, 16 * scale);

      g.fillStyle(
        Phaser.Display.Color.HexStringToColor(BALLOON_COLORS[i % BALLOON_COLORS.length]).color,
        isEliminated ? 0.4 : 1
      );
      g.fillEllipse(x, y, BALLOON_RADIUS_X * 2 * scale, BALLOON_RADIUS_Y * 2 * scale);
      // A small highlight, for a bit of shine instead of a flat circle.
      g.fillStyle(0xffffff, 0.25);
      g.fillEllipse(
        x - BALLOON_RADIUS_X * 0.35 * scale,
        y - BALLOON_RADIUS_Y * 0.35 * scale,
        BALLOON_RADIUS_X * 0.5 * scale,
        BALLOON_RADIUS_Y * 0.35 * scale
      );
    }
  }

  private drawBanner() {
    const g = this.bannerGraphics;
    g.clear();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.bannerBg).color, 0.96);
    g.fillRect(0, 0, CANVAS_WIDTH, BANNER_HEIGHT);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.bannerBorder).color, 1);
    g.fillRect(0, BANNER_HEIGHT - 3, CANVAS_WIDTH, 3);

    const question = this.state.currentQuestion;
    this.questionText.setText(question?.prompt ?? "");
    if (question) {
      this.questionText.setFontSize(questionFontSizeFor(question.prompt));
    }
  }

  private drawHud() {
    const questionNumber = this.questions.length - this.state.queue.length;
    const clamped = Math.max(0, Math.min(this.questions.length, questionNumber));
    this.progressText.setText(
      this.state.phase === "finished" ? "" : `Question ${clamped}/${this.questions.length}`
    );
    this.scoreText.setText(`Score: ${this.state.score}`);
  }

  private drawCountdown() {
    if (this.state.phase !== "countdown") {
      this.countdownText.setText("");
      return;
    }
    const secondsLeft = Math.ceil(this.state.countdownMs / 1000);
    this.countdownText.setText(secondsLeft > 0 ? String(secondsLeft) : "GO!");
  }
}
