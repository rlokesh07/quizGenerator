"use client";

import { useState } from "react";
import type { Question } from "@/lib/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Props {
  title: string;
  questions: Question[];
}

function isCorrect(question: Question, answer: string | undefined): boolean {
  if (!answer) return false;
  return answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
}

export function QuizForm({ title, questions }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [phase, setPhase] = useState<"quiz" | "results">("quiz");
  const [shortAnswerInput, setShortAnswerInput] = useState("");

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const progress = Math.round((currentIndex / questions.length) * 100);

  const numCorrect = questions.filter((q, i) => isCorrect(q, answers[i])).length;
  const scorePercent = Math.round((numCorrect / questions.length) * 100);

  function advance() {
    if (isLast) {
      setPhase("results");
    } else {
      setCurrentIndex((i) => i + 1);
      setShortAnswerInput("");
    }
  }

  function handleMultipleChoiceSelect(val: string) {
    setAnswers((prev) => ({ ...prev, [currentIndex]: val }));
    setTimeout(advance, 350);
  }

  function handleShortAnswerNext() {
    if (!shortAnswerInput.trim()) return;
    setAnswers((prev) => ({ ...prev, [currentIndex]: shortAnswerInput.trim() }));
    advance();
  }

  function handleRestart() {
    setCurrentIndex(0);
    setAnswers({});
    setPhase("quiz");
    setShortAnswerInput("");
  }

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
          {/* Score header */}
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Results</p>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p
              className={`text-5xl font-black tabular-nums ${
                scorePercent >= 70 ? "text-green-500" : "text-red-500"
              }`}
            >
              {scorePercent}%
            </p>
            <p className="text-muted-foreground text-sm">
              {numCorrect} of {questions.length} correct
            </p>
          </div>

          {/* Per-question breakdown */}
          <div className="space-y-3">
            {questions.map((q, i) => {
              const userAnswer = answers[i];
              const correct = isCorrect(q, userAnswer);
              return (
                <Card
                  key={q.id}
                  className={`border-l-4 ${correct ? "border-l-green-500" : "border-l-red-500"}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold leading-snug text-foreground">
                      {i + 1}. {q.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-muted-foreground w-28 shrink-0">Your answer</span>
                      <span className={correct ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                        {userAnswer ?? <em className="font-normal text-muted-foreground">No answer</em>}
                      </span>
                    </div>
                    {!correct && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground w-28 shrink-0">Correct answer</span>
                        <span className="text-green-600 font-medium">{q.correctAnswer}</span>
                      </div>
                    )}
                    {q.explanation && q.explanation.length > 0 && (
                      <div className="pt-2 border-t mt-2 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explanation</p>
                        {q.explanation.map((line, j) => (
                          <p key={j} className="text-muted-foreground">{line}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button onClick={handleRestart} className="w-full" size="lg" variant="outline">
            Retake Quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quiz</p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium text-muted-foreground">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Question card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold leading-snug">
              {current.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {current.type === "multiple_choice" && current.options ? (
              <RadioGroup
                value={answers[currentIndex] ?? ""}
                onValueChange={handleMultipleChoiceSelect}
                className="space-y-2"
              >
                {current.options.map((opt, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <RadioGroupItem value={opt} id={`q-${currentIndex}-${j}`} />
                    <Label htmlFor={`q-${currentIndex}-${j}`} className="flex-1 cursor-pointer font-normal text-sm">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Your answer…"
                  value={shortAnswerInput}
                  onChange={(e) => setShortAnswerInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleShortAnswerNext()}
                  autoFocus
                />
                <Button onClick={handleShortAnswerNext} disabled={!shortAnswerInput.trim()} size="sm">
                  {isLast ? "Finish" : "Next"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
