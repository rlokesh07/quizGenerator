import type {
  DocumentSnapshot,
  DocumentData,
} from "firebase-admin/firestore";
import { getDb, QUESTIONS_COLLECTION } from "./firebase";
import type { Question } from "./schemas";

/** Maps a Firestore question document to the public Question shape (no embedding). */
export function toQuestion(
  snap: DocumentSnapshot<DocumentData>,
): Question | null {
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    id: snap.id,
    question: data.question,
    type: data.type,
    topic: data.topic,
    options: data.options ?? null,
    correctAnswer: data.correctAnswer ?? "",
    attempted: data.attempted ?? 0,
    correct: data.correct ?? 0,
    explanation: data.explanation ?? [],
  };
}

/** Fetches a single question by id, or null if it does not exist. */
export async function getQuestion(id: string): Promise<Question | null> {
  const snap = await getDb().collection(QUESTIONS_COLLECTION).doc(id).get();
  return toQuestion(snap);
}

/**
 * Given a list of question ids, returns which ones do not exist in Firestore.
 * Preserves input order and de-duplicates before lookup.
 */
export async function findMissingQuestionIds(
  ids: string[],
): Promise<string[]> {
  const db = getDb();
  const unique = [...new Set(ids)];
  const refs = unique.map((id) =>
    db.collection(QUESTIONS_COLLECTION).doc(id),
  );
  const snaps = await db.getAll(...refs);
  return snaps.filter((s) => !s.exists).map((s) => s.id);
}

/** Fetches many questions by id, preserving the requested order. */
export async function getQuestionsByIds(
  ids: string[],
): Promise<Question[]> {
  if (ids.length === 0) return [];
  const db = getDb();
  const refs = ids.map((id) => db.collection(QUESTIONS_COLLECTION).doc(id));
  const snaps = await db.getAll(...refs);
  const byId = new Map<string, Question>();
  for (const snap of snaps) {
    const q = toQuestion(snap);
    if (q) byId.set(q.id, q);
  }
  return ids
    .map((id) => byId.get(id))
    .filter((q): q is Question => q !== undefined);
}
