import { notFound } from "next/navigation";
import { getDb, QUIZZES_COLLECTION } from "@/lib/firebase";
import { getQuestionsByIds } from "@/lib/questions";
import { QuizForm } from "@/components/quiz-form";
import type { Question } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadQuiz(id: string) {
  const snap = await getDb().collection(QUIZZES_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const questions = await getQuestionsByIds(data.questions ?? []);
  return { title: data.title as string, questions };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await loadQuiz(id);
  if (!quiz) notFound();

  return <QuizForm title={quiz.title} questions={quiz.questions as Question[]} />;
}
