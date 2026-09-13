import Phaser from "phaser";
import type { SessionQuestion } from "../types";
import {
  LANE_COUNT,
  LaneRushState,
  applyAnswerResult,
  applyHint,
  createGameState,
  pause as enginePause,
  resume as engineResume,
  shiftLane,
  start,
  update as engineUpdate,
} from "./laneRushEngine";

export const CANVAS_WIDTH = 320;
export const CANVAS_HEIGHT = 560;

const SHOULDER_WIDTH = 14;
const ROAD_WIDTH = CANVAS_WIDTH - SHOULDER_WIDTH * 2;
export const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

const BANNER_HEIGHT = 84;
const HEADER_Y = BANNER_HEIGHT + 22;
export const GATE_SPAWN_Y = BANNER_HEIGHT + 48;
export const CAR_ROW_Y = CANVAS_HEIGHT - 55;

const SCROLL_SPEED_PX_PER_MS = 0.09;
const DASH_LENGTH = 16;
const DASH_GAP = 12;

const PALETTE = {
  sky: "#0b1220",
  grass: "#14532d",
  roadDark: "#1f2937",
  roadLight: "#273449",
  laneLine: "#64748b",
  car: "#2563eb",
  carAccent: "#1d4ed8",
  carWindow: "#0f172a",
  headlight: "#fde68a",
  gateA: "#111827",
  gateB: "#f59e0b",
  answerText: "#f9fafb",
  bannerBg: "#111827",
  bannerBorder: "#f59e0b",
  hudText: "#cbd5e1",
};

function fontSizeFor(text: string): number {
  if (text.length > 16) return 10;
  if (text.length > 10) return 12;
  return 14;
}

function questionFontSizeFor(text: string): number {
  if (text.length > 90) return 12;
  if (text.length > 55) return 14;
  return 16;
}

export function laneToX(lane: number): number {
  return SHOULDER_WIDTH + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

function laneLeftEdgeX(lane: number): number {
  return SHOULDER_WIDTH + lane * LANE_WIDTH;
}

/** Events the scene emits for the React wrapper to react to — it never
 * reaches into scene internals directly, only listens on these. */
export const LANE_RUSH_EVENTS = {
  ANSWER_LOCKED: "answer-locked",
  RACE_FINISHED: "race-finished",
  // Fired whenever the current gate's question changes (a new one spawns,
  // or the race ends) - the React wrapper uses this to know a hint no
  // longer applies to whatever question is now current.
  GATE_CHANGED: "gate-changed",
} as const;

export class LaneRushScene extends Phaser.Scene {
  private state!: LaneRushState;
  private questions: SessionQuestion[] = [];

  private trackGraphics!: Phaser.GameObjects.Graphics;
  private carGraphics!: Phaser.GameObjects.Graphics;
  private gateGraphics!: Phaser.GameObjects.Graphics;
  private flashGraphics!: Phaser.GameObjects.Graphics;
  private bannerGraphics!: Phaser.GameObjects.Graphics;
  private answerTexts: Phaser.GameObjects.Text[] = [];
  private questionText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private reducedMotion = false;
  private scrollOffset = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private leftWasDown = false;
  private rightWasDown = false;
  private awaitingVerdict = false;
  private finishedEmitted = false;
  private lastEmittedGateId: number | null = null;

  constructor() {
    super({ key: "LaneRushScene" });
  }

  init(data: { questions: SessionQuestion[] }) {
    this.questions = data.questions;
    this.state = createGameState(this.questions);
  }

  create() {
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    this.trackGraphics = this.add.graphics();
    this.carGraphics = this.add.graphics();
    this.gateGraphics = this.add.graphics();
    this.bannerGraphics = this.add.graphics();
    this.flashGraphics = this.add.graphics().setAlpha(0);

    this.answerTexts = Array.from({ length: LANE_COUNT }, (_, lane) =>
      this.add
        .text(laneToX(lane), HEADER_Y, "", {
          fontFamily: "system-ui, sans-serif",
          color: PALETTE.answerText,
          align: "center",
          wordWrap: { width: LANE_WIDTH - 8 },
        })
        .setOrigin(0.5)
    );

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
        color: PALETTE.answerText,
        align: "center",
        wordWrap: { width: CANVAS_WIDTH - 32 },
      })
      .setOrigin(0.5, 0);

    this.countdownText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: PALETTE.answerText,
      })
      .setOrigin(0.5);
    this.feedbackText = this.add
      .text(CANVAS_WIDTH / 2, CAR_ROW_Y - 90, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey("A");
      this.keyD = this.input.keyboard.addKey("D");
    }

    this.state = start(this.state);
    this.render();
  }

  update(_time: number, delta: number) {
    this.handleKeyboardInput();
    this.state = engineUpdate(this.state, delta);

    if (this.state.phase === "running" && !this.state.pendingResolution && !this.reducedMotion) {
      this.scrollOffset += delta * SCROLL_SPEED_PX_PER_MS;
    }

    this.render();

    if (this.state.pendingResolution && !this.awaitingVerdict) {
      this.awaitingVerdict = true;
      // Emitted on the game-level bus, not this.events (the scene's own
      // emitter) — the React wrapper attaches its listeners right after
      // `new Phaser.Game(...)`, before this scene has actually been
      // booted (Phaser adds/starts scenes asynchronously on the next
      // tick), so only the game-level emitter is guaranteed to exist
      // that early.
      this.game.events.emit(LANE_RUSH_EVENTS.ANSWER_LOCKED, this.state.pendingResolution);
    }

    const currentGateId = this.state.currentGate?.question.session_question_id ?? null;
    if (currentGateId !== this.lastEmittedGateId) {
      this.lastEmittedGateId = currentGateId;
      this.game.events.emit(LANE_RUSH_EVENTS.GATE_CHANGED, currentGateId);
    }

    if (this.state.phase === "finished" && !this.finishedEmitted) {
      this.finishedEmitted = true;
      this.game.events.emit(LANE_RUSH_EVENTS.RACE_FINISHED, {
        score: this.state.score,
        totalQuestions: this.questions.length,
        answers: this.state.answers,
      });
    }
  }

  /** Called by the React wrapper once the server has answered whether the
   * locked-in choice was correct. The scene never decides this itself. */
  applyServerVerdict(correct: boolean) {
    this.awaitingVerdict = false;
    this.state = applyAnswerResult(this.state, correct);
    this.showFeedback(correct);
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

  /** Called from the React wrapper's on-screen touch buttons — Phaser
   * itself has no opinion on mobile UI chrome, so that's rendered as
   * ordinary HTML overlaying the canvas (see CLAUDE.md "touch/mobile
   * controls"), and just calls into the scene through these. */
  pressLeft() {
    this.state = shiftLane(this.state, -1);
  }

  pressRight() {
    this.state = shiftLane(this.state, 1);
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
    return this.state.currentGate?.question.session_question_id ?? null;
  }

  applyHint(eliminatedAnswerIds: number[]) {
    this.state = applyHint(this.state, eliminatedAnswerIds);
  }

  private handleKeyboardInput() {
    if (!this.cursors) return;

    const leftDown = this.cursors.left.isDown || this.keyA?.isDown;
    const rightDown = this.cursors.right.isDown || this.keyD?.isDown;

    if (leftDown && !this.leftWasDown) {
      this.state = shiftLane(this.state, -1);
    }
    if (rightDown && !this.rightWasDown) {
      this.state = shiftLane(this.state, 1);
    }
    this.leftWasDown = !!leftDown;
    this.rightWasDown = !!rightDown;
  }

  private render() {
    this.drawTrack();
    this.drawBanner();
    this.drawAnswerLabels();
    this.drawGate();
    this.drawCar();
    this.drawCountdown();
    this.drawHud();
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

  private drawBanner() {
    const g = this.bannerGraphics;
    g.clear();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.bannerBg).color, 0.96);
    g.fillRect(0, 0, CANVAS_WIDTH, BANNER_HEIGHT);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.bannerBorder).color, 1);
    g.fillRect(0, BANNER_HEIGHT - 3, CANVAS_WIDTH, 3);

    const gate = this.state.currentGate;
    this.questionText.setText(gate?.question.prompt ?? "");
    if (gate) {
      this.questionText.setFontSize(questionFontSizeFor(gate.question.prompt));
    }
  }

  private drawAnswerLabels() {
    const gate = this.state.currentGate;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const text = this.answerTexts[lane];
      const choice = gate?.question.choices[lane];
      text.setText(choice?.text ?? "");
      if (choice) {
        text.setFontSize(fontSizeFor(choice.text));
        // A hint-eliminated lane is still driveable (its gate square isn't
        // physically blocked), just visually marked as ruled-out - same
        // "disabled but not removed" treatment as the Classic mode choices.
        const eliminated = this.state.eliminatedAnswerIds.includes(choice.id);
        text.setColor(eliminated ? "#64748b" : PALETTE.answerText);
        text.setAlpha(eliminated ? 0.5 : 1);
      }
    }
  }

  private drawGate() {
    const g = this.gateGraphics;
    g.clear();
    const gate = this.state.currentGate;
    if (!gate) return;
    const y = GATE_SPAWN_Y + (CAR_ROW_Y - GATE_SPAWN_Y) * Math.min(gate.progress, 1);

    // A checkered finish-line-style bar reads much more like "a real gate
    // you're driving through" than a flat line of color.
    const barHeight = 10;
    const squareSize = 10;
    const roadLeft = SHOULDER_WIDTH;
    const squareCount = Math.ceil(ROAD_WIDTH / squareSize);
    for (let i = 0; i < squareCount; i++) {
      const isDark = i % 2 === 0;
      g.fillStyle(
        Phaser.Display.Color.HexStringToColor(isDark ? PALETTE.gateA : PALETTE.gateB).color,
        1
      );
      g.fillRect(roadLeft + i * squareSize, y - barHeight / 2, squareSize, barHeight);
    }
  }

  private drawTrack() {
    const g = this.trackGraphics;
    g.clear();

    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.sky).color, 1);
    g.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.grass).color, 1);
    g.fillRect(0, 0, SHOULDER_WIDTH, CANVAS_HEIGHT);
    g.fillRect(CANVAS_WIDTH - SHOULDER_WIDTH, 0, SHOULDER_WIDTH, CANVAS_HEIGHT);

    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const color = lane % 2 === 0 ? PALETTE.roadDark : PALETTE.roadLight;
      g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
      g.fillRect(laneLeftEdgeX(lane), 0, LANE_WIDTH, CANVAS_HEIGHT);
    }

    // Scrolling dashed lane dividers — the only moving background element,
    // to read as "driving forward" without needing sprite art. Frozen
    // (via scrollOffset not advancing) while a gate answer is pending, and
    // skipped for reduced-motion players.
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.laneLine).color, 1);
    const period = DASH_LENGTH + DASH_GAP;
    const dashStartY = GATE_SPAWN_Y - period;
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const x = laneLeftEdgeX(lane) - 1;
      const offset = this.reducedMotion ? 0 : this.scrollOffset % period;
      for (let y = dashStartY + offset; y < CANVAS_HEIGHT; y += period) {
        g.fillRect(x, y, 2, DASH_LENGTH);
      }
    }
  }

  private drawCar() {
    const g = this.carGraphics;
    g.clear();
    const cx = laneToX(this.state.carLane);
    const cy = CAR_ROW_Y;
    const w = 36;
    const h = 50;

    // Wheels first, so the body/windows layer on top.
    g.fillStyle(0x0b1220, 1);
    g.fillRoundedRect(cx - w / 2 - 3, cy - h / 2 + 6, 5, 14, 2);
    g.fillRoundedRect(cx + w / 2 - 2, cy - h / 2 + 6, 5, 14, 2);
    g.fillRoundedRect(cx - w / 2 - 3, cy + h / 2 - 20, 5, 14, 2);
    g.fillRoundedRect(cx + w / 2 - 2, cy + h / 2 - 20, 5, 14, 2);

    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.car).color, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 8);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.carAccent).color, 1);
    g.fillRoundedRect(cx - w / 2, cy + h / 2 - 10, w, 10, 6);

    // Windshield toward the front (top — the car drives "up" the screen
    // toward oncoming gates) and a smaller rear window.
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.carWindow).color, 1);
    g.fillRoundedRect(cx - w / 2 + 6, cy - h / 2 + 7, w - 12, h / 2 - 10, 4);
    g.fillRoundedRect(cx - w / 2 + 8, cy + 4, w - 16, h / 2 - 16, 3);

    // Headlights.
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.headlight).color, 1);
    g.fillCircle(cx - w / 2 + 5, cy - h / 2 + 4, 2.5);
    g.fillCircle(cx + w / 2 - 5, cy - h / 2 + 4, 2.5);
  }
}
