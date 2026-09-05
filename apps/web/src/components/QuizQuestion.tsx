import { useState } from "react";
import type { QuizSession } from "../types";

interface QuizQuestionProps {
  session: QuizSession;
}

export function QuizQuestion({ session }: QuizQuestionProps) {
  const [index] = useState(0);
  const current = session.questions[index];

  return <h2 className="text-lg font-medium">{current.prompt}</h2>;
}
