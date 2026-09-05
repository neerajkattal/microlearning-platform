import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { api } from "../api";
import { CANVAS_HEIGHT, CANVAS_WIDTH, LANE_RUSH_EVENTS, LaneRushScene } from "../game/LaneRushScene";
import type { CompleteSessionResult, QuizSession } from "../types";

interface LaneRushProps {
  session: QuizSession;
  onComplete: (result: CompleteSessionResult) => void;
}

const SCENE_KEY = "LaneRushScene";

interface AnswerLockedPayload {
  sessionQuestionId: number;
  chosenAnswerId: number;
}

export function LaneRush({ session, onComplete }: LaneRushProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onCompleteRef = useRef(onComplete);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!containerRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      parent: containerRef.current,
      backgroundColor: "#111827",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      },
    });
    gameRef.current = game;
    game.scene.add(SCENE_KEY, LaneRushScene, true, { questions: session.questions });

    setFullscreenSupported(game.scale.fullscreen.available);
    game.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, () => setIsFullscreen(true));
    game.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, () => setIsFullscreen(false));

    let questionStartedAt = Date.now();

    // Listening on the game-level event bus, not the scene's own — Phaser
    // adds/starts scenes asynchronously (on the next tick after
    // `scene.add(...)`), so `game.scene.getScene(...)` is still null right
    // here. `game.events` exists synchronously from the moment the Game is
    // constructed, so it's the only thing safe to attach listeners to this
    // early. The scene itself is looked up lazily below, once these
    // callbacks actually fire — by then it's always booted.
    game.events.on(LANE_RUSH_EVENTS.ANSWER_LOCKED, async (pending: AnswerLockedPayload) => {
      const responseTimeMs = Date.now() - questionStartedAt;
      const result = await api.submitAnswer({
        sessionId: session.id,
        sessionQuestionId: pending.sessionQuestionId,
        selectedAnswerId: pending.chosenAnswerId,
        responseTimeMs,
      });
      questionStartedAt = Date.now();
      const scene = game.scene.getScene(SCENE_KEY) as LaneRushScene | null;
      scene?.applyServerVerdict(result.is_correct);
    });

    game.events.on(LANE_RUSH_EVENTS.RACE_FINISHED, async () => {
      const completeResult = await api.completeQuizSession(session.id);
      onCompleteRef.current(completeResult);
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately
    // keyed on session.id only; onComplete is read via onCompleteRef so
    // its identity changing doesn't tear down and recreate the game.
  }, [session.id]);

  function getScene(): LaneRushScene | null {
    return (gameRef.current?.scene.getScene(SCENE_KEY) as LaneRushScene | undefined) ?? null;
  }

  function toggleFullscreen() {
    const game = gameRef.current;
    if (!game) return;
    if (game.scale.isFullscreen) {
      game.scale.stopFullscreen();
    } else {
      game.scale.startFullscreen();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between" style={{ width: CANVAS_WIDTH, margin: "0 auto" }}>
        <span className="text-xs text-gray-500">Steer with ◀ ▶ or A/D</span>
        {fullscreenSupported && (
          <button
            onClick={toggleFullscreen}
            className="text-xs px-3 py-1.5 border rounded-md hover:bg-gray-50"
          >
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className="mx-auto"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: "100%" }}
      />
      <div className="flex justify-between sm:hidden" style={{ width: CANVAS_WIDTH, margin: "0 auto" }}>
        <button
          onClick={() => getScene()?.pressLeft()}
          aria-label="Move left"
          className="px-6 py-3 border rounded-lg text-lg"
        >
          ◀
        </button>
        <button
          onClick={() => getScene()?.pressRight()}
          aria-label="Move right"
          className="px-6 py-3 border rounded-lg text-lg"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
