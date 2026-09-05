import type { CompleteSessionResult } from "../types";

interface ResultsScreenProps {
  result: CompleteSessionResult;
}

export function ResultsScreen({ result }: ResultsScreenProps) {
  return (
    <div className="max-w-md mx-auto text-center space-y-2">
      <h2 className="text-xl font-semibold">Quiz complete</h2>
      <p>
        {result.score} / {result.total_questions} correct
      </p>
      <div className="text-sm text-gray-600 space-y-1">
        <p>+{result.xp_earned} XP</p>
        <p>Total XP: {result.total_xp}</p>
        <p>Level {result.level}</p>
        <p>Streak: {result.streak} day(s)</p>
      </div>
    </div>
  );
}
