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
import { Button } from "./ui/Button";

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
  const [paused, setPaused] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintedQuestionId, setHintedQuestionId] = useState<number | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  // Excluded from each question's response_time_ms the same way as
  // Classic mode and Lane Rush, so pausing mid-question doesn't tank the
  // speed bonus.
  const pausedDurationRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

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
      const responseTimeMs = Date.now() - questionStartedAt - pausedDurationRef.current;
      const result = await api.submitAnswer({
        sessionId: session.id,
        sessionQuestionId: pending.sessionQuestionId,
        selectedAnswerId: pending.chosenAnswerId,
        responseTimeMs,
      });
      questionStartedAt = Date.now();
      pausedDurationRef.current = 0;
      const scene = game.scene.getScene(SCENE_KEY) as BalloonPopScene | null;
      scene?.applyServerVerdict(result.is_correct);
    });

    game.events.on(BALLOON_POP_EVENTS.GAME_FINISHED, async () => {
      const completeResult = await api.completeQuizSession(session.id);
      onCompleteRef.current(completeResult);
    });

    game.events.on(BALLOON_POP_EVENTS.QUESTION_CHANGED, (sessionQuestionId: number | null) => {
      setCurrentQuestionId(sessionQuestionId);
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

  function pauseGame() {
    const scene = getScene();
    if (!scene || !scene.isPaused()) {
      scene?.pauseGame();
      pausedAtRef.current = Date.now();
      setPaused(true);
    }
  }

  function resumeGame() {
    const scene = getScene();
    scene?.resumeGame();
    if (pausedAtRef.current !== null) {
      pausedDurationRef.current += Date.now() - pausedAtRef.current;
    }
    pausedAtRef.current = null;
    setPaused(false);
  }

  // Spacebar toggles pause/resume from anywhere while the game is
  // mounted - preventDefault stops both page-scroll and the browser's
  // own "activate the focused button" behavior for Space, which would
  // otherwise double-toggle if a control button happens to have focus.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (paused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pauseGame/
    // resumeGame close over refs, not state, so they don't need to be
    // dependencies; only `paused` itself determines which one to call.
  }, [paused]);

  function stopGame() {
    if (window.confirm("Stop this quiz? You'll see results for what you've answered so far.")) {
      getScene()?.stopGame();
    }
  }

  async function useHint() {
    const scene = getScene();
    const sessionQuestionId = scene?.getCurrentSessionQuestionId();
    if (!scene || sessionQuestionId == null || hintLoading || hintedQuestionId === sessionQuestionId) return;
    setHintLoading(true);
    try {
      const hint = await api.getHint({ sessionId: session.id, sessionQuestionId });
      scene.applyHint(hint.eliminated_answer_ids);
      setHintedQuestionId(sessionQuestionId);
    } finally {
      setHintLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5" style={{ width: CANVAS_WIDTH, margin: "0 auto" }}>
        <span className="text-xs text-slate-500">Tap a balloon, or press 1-4 &middot; Space to pause</span>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={useHint}
              disabled={hintLoading || hintedQuestionId === currentQuestionId || currentQuestionId === null}
              aria-label="Get a hint"
              title="Eliminate two wrong balloons"
              className="rounded-full p-2 border border-slate-700 text-amber-400 hover:border-amber-500/60
                hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-sm"
            >
              💡
            </button>
            <button
              onClick={pauseGame}
              aria-label="Pause"
              title="Pause the game (or press Space)"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 border border-slate-600
                text-slate-100 hover:border-slate-400 hover:bg-slate-800 transition-colors text-sm font-semibold"
            >
              <span aria-hidden>⏸</span> Pause
            </button>
            <button
              onClick={stopGame}
              aria-label="Stop"
              title="End the quiz now"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 border border-red-500/50
                text-red-300 hover:border-red-500 hover:bg-red-500/10 transition-colors text-sm font-semibold"
            >
              <span aria-hidden>⏹</span> Stop
            </button>
          </div>
          {fullscreenSupported && (
            <button
              onClick={toggleFullscreen}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-300
                hover:border-amber-500/50 hover:text-amber-300 transition-colors whitespace-nowrap"
            >
              {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>
          )}
        </div>
      </div>
      <div
        className="relative mx-auto rounded-xl overflow-hidden border border-slate-800 shadow-card"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: "100%" }}
      >
        <div ref={containerRef} className="w-full h-full" />
        {paused && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4
              bg-slate-950/90 backdrop-blur-sm motion-safe:animate-card-in"
            style={{ animationDuration: "150ms" }}
          >
            <p className="text-2xl font-extrabold text-slate-100">Paused</p>
            <Button onClick={resumeGame}>Resume</Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 sm:hidden" style={{ width: CANVAS_WIDTH, margin: "0 auto" }}>
        {[0, 1, 2, 3].map((index) => (
          <button
            key={index}
            onClick={() => getScene()?.popByIndex(index)}
            disabled={paused}
            aria-label={`Pop balloon ${index + 1}`}
            className="px-3 py-3 rounded-lg border border-slate-700 bg-slate-900 text-lg text-slate-200
              active:bg-slate-800 disabled:opacity-30"
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
