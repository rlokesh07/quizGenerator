import { z } from "zod";

export const QUESTION_TYPES = ["multiple_choice", "short_answer"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * Body for POST /api/question.
 * `options` is required (non-empty) only for multiple_choice questions,
 * and must be null/omitted otherwise.
 */
export const createQuestionSchema = z
  .object({
    question: z.string().trim().min(1, "question is required"),
    type: z.enum(QUESTION_TYPES),
    topic: z.string().trim().min(1, "topic is required"),
    options: z.array(z.string().trim().min(1)).min(2).nullish(),
    correctAnswer: z.string().trim().min(1, "correctAnswer is required"),
    explanation: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === "multiple_choice") {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "multiple_choice questions require at least 2 options",
        });
      } else if (!data.options.includes(data.correctAnswer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctAnswer"],
          message: "correctAnswer must be one of the provided options",
        });
      }
    } else if (data.options != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: `options are only allowed for multiple_choice questions`,
      });
    }
  });

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

/** Body for POST /api/quiz. */
export const createQuizSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  questionIds: z
    .array(z.string().trim().min(1))
    .min(1, "at least one questionId is required"),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

/** Body for POST /api/question/:id/attempt. */
export const attemptSchema = z.object({
  answer: z.string().min(1, "answer is required"),
});

export type AttemptInput = z.infer<typeof attemptSchema>;

/** Stored/returned shape of a question (without embedding). */
export interface Question {
  id: string;
  question: string;
  type: string;
  topic: string;
  options: string[] | null;
  correctAnswer: string;
  attempted: number;
  correct: number;
  explanation: string[];
}
