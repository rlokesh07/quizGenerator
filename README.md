# Quiz Generator

A Next.js (App Router) API backed by Firestore for creating questions and quizzes,
retrieving them for rendering, and running vector similarity search over question
text using OpenAI embeddings + Firestore's native `findNearest`.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Firestore (via `firebase-admin`)
- OpenAI embeddings (`text-embedding-3-small`, 1536 dims)
- Zod for request validation
- Deployed on Railway

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` come from a
  Firebase service account JSON (Project Settings -> Service accounts -> Generate new
  private key). When pasting `FIREBASE_PRIVATE_KEY`, keep the `\n` escapes and wrap it
  in double quotes.
- `OPENAI_API_KEY` is required for embeddings.

3. Run locally:

```bash
npm run dev
```

## Local Unkey for API-key tests

The repository can run a local development-only Unkey v2.0.73 service for
`scripts/test-flow.sh`. It stores data in Docker volumes and exposes its API at
`http://localhost:8080`.

Initialize a fresh local instance:

```bash
bash scripts/reset-unkey.sh
```

This removes the local Unkey Docker volumes, downloads the pinned Unkey schema
assets, starts the containers, and writes generated credentials to `.unkey.env`.
That file is ignored by Git and must remain private.

On later starts, use:

```bash
docker compose up -d
```

Load both the application configuration and generated Unkey credentials before
starting the app or test flow:

```bash
set -a
source .env
source .unkey.env
set +a

npm run dev
# In another terminal:
bash scripts/test-flow.sh
```

The test flow uses unique Alice and Bob identities on every run. Reset Unkey
only when you want to discard all local API keys and identities.

## Firestore vector index (required for search)

`GET /api/question/:search/:numResults` uses `findNearest`, which requires a KNN
vector index on the `questions.embedding` field. Create it once with the gcloud CLI:

```bash
gcloud firestore indexes composite create \
  --collection-group=questions \
  --query-scope=COLLECTION \
  --field-config=vector-config='{"dimension":1536,"flat":{}}',field-path=embedding
```

The `dimension` must match the embedding model (1536 for `text-embedding-3-small`).
Search will return an error until the index finishes building.

## Data model

`questions/{id}`:

| field       | type              | notes                                   |
| ----------- | ----------------- | --------------------------------------- |
| question    | string            |                                         |
| type        | string            | `multiple_choice` \| `short_answer`     |
| topic       | string            |                                         |
| options     | string[] \| null  | only for `multiple_choice`              |
| attempted   | number            | defaults to 0                           |
| correct     | number            | defaults to 0                           |
| explanation | string[]          |                                         |
| embedding   | Vector(1536)      | indexed for KNN search                  |
| createdAt   | Timestamp         |                                         |

`quizzes/{id}`:

| field     | type      | notes                                |
| --------- | --------- | ------------------------------------ |
| title     | string    |                                      |
| questions | string[]  | question ids (validated on create)   |
| createdAt | Timestamp |                                      |

## API

### POST `/api/question`

Create a question (embedding is generated server-side).

Request:

```json
{
  "question": "What is the capital of France?",
  "type": "multiple_choice",
  "topic": "geography",
  "options": ["Paris", "London", "Berlin", "Madrid"],
  "explanation": ["Paris is the capital and largest city of France."]
}
```

Response `201`:

```json
{ "id": "abc123" }
```

For `short_answer` questions omit `options` (or send `null`).

### GET `/api/question/:id`

Response `200`:

```json
{
  "question": "What is the capital of France?",
  "type": "multiple_choice",
  "topic": "geography",
  "options": ["Paris", "London", "Berlin", "Madrid"],
  "attempted": 0,
  "correct": 0,
  "explanation": ["Paris is the capital and largest city of France."]
}
```

Response `404` if the id does not exist (used to validate quiz question ids).

### GET `/api/question/:search/:numResults`

Vector similarity search. `search` is URL-encoded text, `numResults` is clamped to
1..50. Routed internally under `/api/question/search/...` to avoid colliding with
`/api/question/:id`.

Example: `GET /api/question/capital%20of%20europe/5`

Response `200`:

```json
{ "ids": ["abc123", "def456"] }
```

### POST `/api/quiz`

Validates that every `questionId` exists before saving. Quizzes are immutable.

Request:

```json
{ "title": "European Capitals", "questionIds": ["abc123", "def456"] }
```

Response `201`:

```json
{ "id": "quiz789" }
```

Response `400` if any ids are missing:

```json
{ "error": "Some questionIds do not exist", "details": { "missing": ["def456"] } }
```

Share the quiz at `/quiz/quiz789`.

### GET `/api/quiz/:id`

Response `200` (questions hydrated for rendering):

```json
{
  "id": "quiz789",
  "title": "European Capitals",
  "questions": [
    {
      "id": "abc123",
      "question": "What is the capital of France?",
      "type": "multiple_choice",
      "topic": "geography",
      "options": ["Paris", "London", "Berlin", "Madrid"],
      "attempted": 0,
      "correct": 0,
      "explanation": ["Paris is the capital and largest city of France."]
    }
  ]
}
```

Response `404` if the quiz does not exist.

### POST `/api/question/:id/attempt`

Records an answer attempt by atomically incrementing stats. Questions are mutable.

Request:

```json
{ "correct": true }
```

Response `200`:

```json
{ "attempted": 1, "correct": 1 }
```

## Deploy to Railway

1. Push this repo to GitHub and create a Railway project from it (`railway.json` is
   included; Railway builds with Nixpacks and runs `npm run start`).
2. Set the environment variables from `.env.example` in the Railway service settings.
3. Railway sets `PORT` automatically; the start script binds to it.
4. Ensure the Firestore vector index (above) has been created.
