import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { api } from "../api";
import {
  BALLOON_POP_EVENTS,
  BalloonPopScene,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
} from "../game/BalloonPopScene";
import type { CompleteSessionResult, QuizSession } from "../types";

interface BalloonPopProps {
  session: QuizSession;
  onComplete: (result: CompleteSessionResult) => void;
}

const SCENE_KEY = "BalloonPopScene";

interface AnswerLockedPayload {
  sessionQuestionId: number;
  chosenAnswerId: number;
}

export function BalloonPop({ session, onComplete }: BalloonPopProps) {
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
      backgroundColor: "#0b1220",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      },
    });
    gameRef.current = game;
    game.scene.add(SCENE_KEY, BalloonPopScene, true, { questions: session.questions });

    setFullscreenSupported(game.scale.fullscreen.available);
    game.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, () => setIsFullscreen(true));
    game.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, () => setIsFullscreen(false));

    let questionStartedAt = Date.now();

    // Listening on the game-level event bus, not the scene's own — real
    // Phaser adds/boots scenes asynchronously, so `game.scene.getScene(...)`
    // right after `add()` would still be null here. `game.events` exists
    // synchronously from the moment the Game is constructed. The scene
    // itself is looked up lazily below, once these callbacks actually
    // fire, by which point it's always booted. (Lane Rush hit this exact
    // bug for real — see docs/learning/TROUBLESHOOTING.md #9.)
    game.events.on(BALLOON_POP_EVENTS.ANSWER_LOCKED, async (pending: AnswerLockedPayload) => {
      const responseTimeMs = Date.now() - questionStartedAt;
      const result = await api.submitAnswer({
        sessionId: session.id,
        sessionQuestionId: pending.sessionQuestionId,
        selectedAnswerId: pending.chosenAnswerId,
        responseTimeMs,
      });
      questionStartedAt = Date.now();
      const scene = game.scene.getScene(SCENE_KEY) as BalloonPopScene | null;
      scene?.applyServerVerdict(result.is_correct);
    });

    game.events.on(BALLOON_POP_EVENTS.GAME_FINISHED, async () => {
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

  function getScene(): BalloonPopScene | null {
    return (gameRef.current?.scene.getScene(SCENE_KEY) as BalloonPopScene | undefined) ?? null;
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
        <span className="text-xs text-gray-500">Tap a balloon, or press 1-4</span>
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
      <div className="grid grid-cols-4 gap-2 sm:hidden" style={{ width: CANVAS_WIDTH, margin: "0 auto" }}>
        {[0, 1, 2, 3].map((index) => (
          <button
            key={index}
            onClick={() => getScene()?.popByIndex(index)}
            aria-label={`Pop balloon ${index + 1}`}
            className="px-3 py-3 border rounded-lg text-lg"
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
