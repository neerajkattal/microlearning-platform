import { useEffect, useState } from "react";
import { adminApi } from "../adminApi";
import type { AdminCategory, AdminQuestion } from "../adminTypes";

const DIFFICULTIES = ["easy", "medium", "hard"];
const EMPTY_ANSWERS = [
  { text: "", is_correct: true },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
  { text: "", is_correct: false },
];

export function ContentTab() {
  const [categories, setCategories] = useState<AdminCategory[] | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");

  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [newText, setNewText] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("easy");
  const [newAnswers, setNewAnswers] = useState(EMPTY_ANSWERS);

  function loadCategories() {
    adminApi
      .listCategories()
      .then((cats) => {
        setCategories(cats);
        if (selectedCategoryId === null && cats.length > 0) setSelectedCategoryId(cats[0].id);
      })
      .catch(() => setError("Couldn't load categories."));
  }

  useEffect(loadCategories, []);

  useEffect(() => {
    if (selectedCategoryId === null) return;
    adminApi
      .listQuestions(selectedCategoryId)
      .then(setQuestions)
      .catch(() => setError("Couldn't load questions."));
  }, [selectedCategoryId]);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.createCategory(newCategoryName, newCategorySlug);
      setNewCategoryName("");
      setNewCategorySlug("");
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that category.");
    }
  }

  async function toggleCategoryActive(category: AdminCategory) {
    setError(null);
    try {
      const updated = await adminApi.updateCategory(category.id, { is_active: !category.is_active });
      setCategories((prev) => prev!.map((c) => (c.id === category.id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that category.");
    }
  }

  async function toggleQuestionActive(question: AdminQuestion) {
    setError(null);
    try {
      const updated = await adminApi.updateQuestion(question.id, { is_active: !question.is_active });
      setQuestions((prev) => prev!.map((q) => (q.id === question.id ? updated : q)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update that question.");
    }
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCategoryId === null) return;
    setError(null);
    try {
      const created = await adminApi.createQuestion({
        text: newText,
        category_id: selectedCategoryId,
        difficulty: newDifficulty,
        answers: newAnswers.filter((a) => a.text.trim().length > 0),
      });
      setQuestions((prev) => [created, ...(prev ?? [])]);
      setNewText("");
      setNewAnswers(EMPTY_ANSWERS);
      setShowNewQuestion(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create that question.");
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm bg-accent-coral/20 border-2 border-ink rounded-lg py-2 px-3">{error}</p>}

      <div className="rounded-xl border-2 border-ink bg-white shadow-card p-4">
        <h3 className="font-semibold mb-3">Categories</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories?.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`text-sm px-3 py-1.5 rounded-full border-2 border-ink transition-colors ${
                selectedCategoryId === category.id ? "bg-accent-yellow" : "bg-white hover:bg-stone-100"
              } ${!category.is_active ? "opacity-40" : ""}`}
            >
              {category.name} ({category.question_count}){!category.is_active && " · off"}
            </button>
          ))}
        </div>
        {categories?.find((c) => c.id === selectedCategoryId) && (
          <button
            onClick={() => toggleCategoryActive(categories.find((c) => c.id === selectedCategoryId)!)}
            className="text-xs font-semibold text-ink underline mb-4"
          >
            {categories.find((c) => c.id === selectedCategoryId)!.is_active
              ? "Deactivate this category"
              : "Reactivate this category"}
          </button>
        )}

        <form onSubmit={handleCreateCategory} className="flex flex-wrap gap-2 items-end border-t border-stone-200 pt-3">
          <div>
            <label className="block text-xs text-stone-600 mb-1">Name</label>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
              className="p-1.5 rounded border-2 border-ink text-sm w-40"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-600 mb-1">Slug</label>
            <input
              value={newCategorySlug}
              onChange={(e) => setNewCategorySlug(e.target.value)}
              required
              pattern="[a-z0-9-]+"
              className="p-1.5 rounded border-2 border-ink text-sm w-40"
            />
          </div>
          <button type="submit" className="text-sm px-3 py-1.5 rounded-lg border-2 border-ink bg-accent-yellow font-semibold">
            + Add category
          </button>
        </form>
      </div>

      <div className="rounded-xl border-2 border-ink bg-white shadow-card p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Questions</h3>
          <button
            onClick={() => setShowNewQuestion((v) => !v)}
            className="text-sm px-3 py-1.5 rounded-lg border-2 border-ink bg-accent-yellow font-semibold"
          >
            {showNewQuestion ? "Cancel" : "+ Add question"}
          </button>
        </div>

        {showNewQuestion && (
          <form onSubmit={handleCreateQuestion} className="space-y-3 border-2 border-ink rounded-lg p-3 mb-4 bg-paper">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Question text"
              required
              className="w-full p-2 rounded border-2 border-ink text-sm"
              rows={2}
            />
            <select
              value={newDifficulty}
              onChange={(e) => setNewDifficulty(e.target.value)}
              className="p-2 rounded border-2 border-ink text-sm"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="space-y-1.5">
              {newAnswers.map((answer, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={answer.is_correct}
                    onChange={() =>
                      setNewAnswers((prev) => prev.map((a, j) => ({ ...a, is_correct: j === i })))
                    }
                  />
                  <input
                    value={answer.text}
                    onChange={(e) =>
                      setNewAnswers((prev) => prev.map((a, j) => (j === i ? { ...a, text: e.target.value } : a)))
                    }
                    placeholder={`Answer ${i + 1}${i === 0 ? " (default correct)" : ""}`}
                    className="flex-1 p-1.5 rounded border-2 border-ink text-sm"
                  />
                </div>
              ))}
            </div>
            <button type="submit" className="text-sm px-3 py-1.5 rounded-lg border-2 border-ink bg-accent-yellow font-semibold">
              Save question
            </button>
          </form>
        )}

        <ul className="space-y-2">
          {questions?.map((question) => (
            <li key={question.id} className={`border-2 border-ink rounded-lg p-3 ${!question.is_active ? "opacity-40" : ""}`}>
              <div className="flex justify-between gap-3">
                <p className="text-sm font-medium">{question.text}</p>
                <button
                  onClick={() => toggleQuestionActive(question)}
                  className="text-xs font-semibold text-ink underline whitespace-nowrap shrink-0"
                >
                  {question.is_active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {question.difficulty} ·{" "}
                {question.answers.map((a) => (a.is_correct ? `✓ ${a.text}` : a.text)).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
        {questions?.length === 0 && <p className="text-sm text-stone-500">No questions in this category yet.</p>}
      </div>
    </div>
  );
}
