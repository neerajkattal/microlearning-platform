import Phaser from "phaser";
import type { SessionQuestion } from "../types";
import {
  LANE_COUNT,
  LaneRushState,
  applyAnswerResult,
  createGameState,
  shiftLane,
  start,
  update as engineUpdate,
} from "./laneRushEngine";

export const CANVAS_WIDTH = 300;
export const CANVAS_HEIGHT = 450;
export const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
export const CAR_ROW_Y = CANVAS_HEIGHT - 60;
export const GATE_SPAWN_Y = 60;
const HEADER_Y = 28;

const PALETTE = {
  shoulder: "#111827",
  roadDark: "#1f2937",
  roadLight: "#273449",
  laneLine: "#4b5563",
  car: "#2563eb",
  carWindow: "#111827",
  gate: "#f59e0b",
  answerText: "#f9fafb",
};

function fontSizeFor(text: string): number {
  if (text.length > 16) return 9;
  if (text.length > 10) return 11;
  return 13;
}

export function laneToX(lane: number): number {
  return lane * LANE_WIDTH + LANE_WIDTH / 2;
}

/** Events the scene emits for the React wrapper to react to — it never
 * reaches into scene internals directly, only listens on these. */
export const LANE_RUSH_EVENTS = {
  ANSWER_LOCKED: "answer-locked",
  RACE_FINISHED: "race-finished",
} as const;

export class LaneRushScene extends Phaser.Scene {
  private state!: LaneRushState;
  private questions: SessionQuestion[] = [];

  private trackGraphics!: Phaser.GameObjects.Graphics;
  private carGraphics!: Phaser.GameObjects.Graphics;
  private gateGraphics!: Phaser.GameObjects.Graphics;
  private flashGraphics!: Phaser.GameObjects.Graphics;
  private answerTexts: Phaser.GameObjects.Text[] = [];
  private countdownText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private reducedMotion = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private leftWasDown = false;
  private rightWasDown = false;
  private awaitingVerdict = false;
  private finishedEmitted = false;

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
    this.flashGraphics = this.add.graphics().setAlpha(0);
    this.answerTexts = Array.from({ length: LANE_COUNT }, (_, lane) =>
      this.add
        .text(laneToX(lane), HEADER_Y, "", {
          fontFamily: "system-ui, sans-serif",
          color: PALETTE.answerText,
          align: "center",
          wordWrap: { width: LANE_WIDTH - 6 },
        })
        .setOrigin(0.5)
    );
    this.countdownText = this.add
      .text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "48px",
        color: PALETTE.answerText,
      })
      .setOrigin(0.5);
    this.feedbackText = this.add
      .text(CANVAS_WIDTH / 2, GATE_SPAWN_Y - 24, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
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
    this.render();

    if (this.state.pendingResolution && !this.awaitingVerdict) {
      this.awaitingVerdict = true;
      this.events.emit(LANE_RUSH_EVENTS.ANSWER_LOCKED, this.state.pendingResolution);
    }

    if (this.state.phase === "finished" && !this.finishedEmitted) {
      this.finishedEmitted = true;
      this.events.emit(LANE_RUSH_EVENTS.RACE_FINISHED, {
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
    this.drawAnswerLabels();
    this.drawGate();
    this.drawCar();
    this.drawCountdown();
  }

  private drawCountdown() {
    if (this.state.phase !== "countdown") {
      this.countdownText.setText("");
      return;
    }
    const secondsLeft = Math.ceil(this.state.countdownMs / 1000);
    this.countdownText.setText(secondsLeft > 0 ? String(secondsLeft) : "GO!");
  }

  private drawAnswerLabels() {
    const gate = this.state.currentGate;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const text = this.answerTexts[lane];
      const choice = gate?.question.choices[lane];
      text.setText(choice?.text ?? "");
      if (choice) {
        text.setFontSize(fontSizeFor(choice.text));
      }
    }
  }

  private drawGate() {
    const g = this.gateGraphics;
    g.clear();
    const gate = this.state.currentGate;
    if (!gate) return;
    const y = GATE_SPAWN_Y + (CAR_ROW_Y - GATE_SPAWN_Y) * Math.min(gate.progress, 1);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.gate).color, 1);
    g.fillRect(0, y - 2, CANVAS_WIDTH, 4);
  }

  private drawTrack() {
    const g = this.trackGraphics;
    g.clear();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.shoulder).color, 1);
    g.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const color = lane % 2 === 0 ? PALETTE.roadDark : PALETTE.roadLight;
      g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
      g.fillRect(lane * LANE_WIDTH, 0, LANE_WIDTH, CANVAS_HEIGHT);
    }
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.laneLine).color, 1);
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      g.fillRect(lane * LANE_WIDTH - 1, 0, 2, CANVAS_HEIGHT);
    }
  }

  private drawCar() {
    const g = this.carGraphics;
    g.clear();
    const cx = laneToX(this.state.carLane);
    const cy = CAR_ROW_Y;
    const w = 32;
    const h = 44;
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.car).color, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 6);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(PALETTE.carWindow).color, 1);
    g.fillRoundedRect(cx - w / 2 + 5, cy - h / 2 + 6, w - 10, h / 2 - 4, 3);
  }
}
