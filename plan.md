I'm building a quiz feature for my website. I need you to create an implementation
plan before writing any code.

CONTEXT:
- Site stack: Next.js + react
- Hosting: Railway
- Database: Firestore

GOAL:
Build an API that:
1. Accepts a quiz configuration (title, questions, settings) via POST request
2. Stores the quiz and returns a unique, shareable URL (e.g. yoursite.com/quiz/abc123)
3. Allows retrieving a quiz by its URL/ID (GET) to render it

- Database schema for quizzes
    - id: uuid
    - title: string
    - questions: uuid[] // the uuid's of the questions in the quiz

- Question schema
    - id: uuid
    - question: string
    - type: string
    - topic: string
    - options: none | string[] // only needed if multiple choice
    - correctAnswer: string // the correct answer; for multiple_choice must match one of options
    - attempted: int
    - correct: int
    - explanation: string[]


- API endpoint design
    - POST /api/question
        Body:{question, type, topic, options | None, correctAnswer, explanation: []}
        Response:{id}

    - POST /api/question/:id/attempt
        Body:{answer: string}
        Response:{correct: boolean, correctAnswer: string, attempted: int, totalCorrect: int}
        // Server compares answer (case-insensitive, trimmed) against stored correctAnswer

    - POST /api/quiz
        Body:{title, questionIds: []}
        Response:{id}

- Validation strategy for incoming quiz data (and LLM-generated output, if used)
- Error handling (invalid input, quiz not found, expired quiz, rate limiting)
- Whether quizzes are anonymous or tied to a user account
- Whether quizzes are mutable after creation

DELIVERABLE:
Don't write implementation code yet. Instead, output:
1. A proposed file/folder structure
2. Database schema (tables/columns/types)
3. API endpoint list with request/response examples
4. A step-by-step build order (what to implement first, second, etc.)
5. Any open questions or assumptions you're making that I should confirm

Ask me clarifying questions if anything above is ambiguous before finalizing the plan.
