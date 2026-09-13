import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { api } from "../api";
import { CANVAS_HEIGHT, CANVAS_WIDTH, LANE_RUSH_EVENTS, LaneRushScene } from "../game/LaneRushScene";
import type { CompleteSessionResult, QuizSession } from "../types";
import { Button } from "./ui/Button";

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
  const [paused, setPaused] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintedGateId, setHintedGateId] = useState<number | null>(null);
  const [currentGateId, setCurrentGateId] = useState<number | null>(null);
  // Excluded from each question's response_time_ms the same way as
  // Classic mode, so pausing mid-question doesn't tank the speed bonus.
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
      const responseTimeMs = Date.now() - questionStartedAt - pausedDurationRef.current;
      const result = await api.submitAnswer({
        sessionId: session.id,
        sessionQuestionId: pending.sessionQuestionId,
        selectedAnswerId: pending.chosenAnswerId,
        responseTimeMs,
      });
      questionStartedAt = Date.now();
      pausedDurationRef.current = 0;
      const scene = game.scene.getScene(SCENE_KEY) as LaneRushScene | null;
      scene?.applyServerVerdict(result.is_correct);
    });

    game.events.on(LANE_RUSH_EVENTS.RACE_FINISHED, async () => {
      const completeResult = await api.completeQuizSession(session.id);
      onCompleteRef.current(completeResult);
    });

    game.events.on(LANE_RUSH_EVENTS.GATE_CHANGED, (sessionQuestionId: number | null) => {
      setCurrentGateId(sessionQuestionId);
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

  async function useHint() {
    const scene = getScene();
    const sessionQuestionId = scene?.getCurrentSessionQuestionId();
    if (!scene || sessionQuestionId == null || hintLoading || hintedGateId === sessionQuestionId) return;
    setHintLoading(true);
    try {
      const hint = await api.getHint({ sessionId: session.id, sessionQuestionId });
      scene.applyHint(hint.eliminated_answer_ids);
      setHintedGateId(sessionQuestionId);
    } finally {
      setHintLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between" style={{ width: CANVAS_WIDTH, margin: "0 auto" }}>
        <span className="text-xs text-slate-500">Steer with ◀ ▶ or A/D</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={useHint}
            disabled={hintLoading || hintedGateId === currentGateId || currentGateId === null}
            aria-label="Get a hint"
            title="Eliminate two wrong lanes"
            className="rounded-full p-1.5 border border-slate-700 text-amber-400 hover:border-amber-500/60
              hover:bg-amber-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-xs"
          >
            💡
          </button>
          <button
            onClick={pauseGame}
            aria-label="Pause"
            className="rounded-full p-1.5 border border-slate-700 text-slate-300 hover:border-slate-500
              hover:text-white transition-colors text-xs"
          >
            ⏸
          </button>
        </div>
        {fullscreenSupported && (
          <button
            onClick={toggleFullscreen}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-300
              hover:border-amber-500/50 hover:text-amber-300 transition-colors"
          >
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>
        )}
      </div>
      <div
        className="relative mx-auto rounded-xl overflow-hidden border border-slate-800 shadow-card"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: "100%" }}
      >
        <div ref={containerRef} className="w-full h-full" />
        {paused && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4
            bg-slate-950/90 backdrop-blur-sm">
            <p className="text-2xl font-extrabold text-slate-100">Paused</p>
            <Button onClick={resumeGame}>Resume</Button>
          </div>
        )}
      </div>
      <div className="flex justify-between sm:hidden" style={{ width: CANVAS_WIDTH, margin: "0 auto" }}>
        <button
          onClick={() => getScene()?.pressLeft()}
          disabled={paused}
          aria-label="Move left"
          className="px-6 py-3 rounded-lg border border-slate-700 bg-slate-900 text-lg text-slate-200
            active:bg-slate-800 disabled:opacity-30"
        >
          ◀
        </button>
        <button
          onClick={() => getScene()?.pressRight()}
          disabled={paused}
          aria-label="Move right"
          className="px-6 py-3 rounded-lg border border-slate-700 bg-slate-900 text-lg text-slate-200
            active:bg-slate-800 disabled:opacity-30"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
