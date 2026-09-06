import { useEffect, useRef } from "react";
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
  const sceneRef = useRef<LaneRushScene | null>(null);
  const onCompleteRef = useRef(onComplete);

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
    });
    game.scene.add(SCENE_KEY, LaneRushScene, true, { questions: session.questions });
    const scene = game.scene.getScene(SCENE_KEY) as LaneRushScene;
    sceneRef.current = scene;

    let questionStartedAt = Date.now();

    scene.events.on(LANE_RUSH_EVENTS.ANSWER_LOCKED, async (pending: AnswerLockedPayload) => {
      const responseTimeMs = Date.now() - questionStartedAt;
      const result = await api.submitAnswer({
        sessionId: session.id,
        sessionQuestionId: pending.sessionQuestionId,
        selectedAnswerId: pending.chosenAnswerId,
        responseTimeMs,
      });
      questionStartedAt = Date.now();
      scene.applyServerVerdict(result.is_correct);
    });

    scene.events.on(LANE_RUSH_EVENTS.RACE_FINISHED, async () => {
      const completeResult = await api.completeQuizSession(session.id);
      onCompleteRef.current(completeResult);
    });

    return () => {
      game.destroy(true);
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately
    // keyed on session.id only; onComplete is read via onCompleteRef so
    // its identity changing doesn't tear down and recreate the game.
  }, [session.id]);

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="mx-auto" style={{ width: CANVAS_WIDTH }} />
      <div className="flex justify-between sm:hidden" style={{ width: CANVAS_WIDTH, margin: "0 auto" }}>
        <button
          onClick={() => sceneRef.current?.pressLeft()}
          aria-label="Move left"
          className="px-6 py-3 border rounded-lg text-lg"
        >
          ◀
        </button>
        <button
          onClick={() => sceneRef.current?.pressRight()}
          aria-label="Move right"
          className="px-6 py-3 border rounded-lg text-lg"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
