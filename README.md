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

## My API Keys (`/login`)

A Firebase-gated page for self-service API key management — no separate
Unkey dashboard deployment, and no admin surface at all (by design, to
minimize attack surface; managing other users' keys is a root-key CLI/API
operation, not a web UI).

After signing in with Google, a user sees only *their own* keys (matched by
Firebase `uid` as the key's `externalId`), each key's enabled/disabled
status, and best-effort usage over the last 30 days. They can create
additional keys for themselves from this page. Backed by
`GET /api/keys/mine` and `POST /api/auth/create-key`, both gated by
`lib/auth.ts#requireUser` — just a valid Firebase ID token, verified
server-side. The Unkey root key and Firebase service account credentials
stay server-side; the browser only ever sends a short-lived Firebase ID
token in the `Authorization: Bearer <token>` header.

Per-key "usage" comes from Unkey's ClickHouse-backed analytics endpoint
(`lib/unkey.ts#getVerificationStats`), which isn't part of the minimal
self-hosted stack below (mysql + redis + the `unkey run api` image, no
ClickHouse). If that query fails, the UI shows "Usage data unavailable"
instead of erroring — the key list and key creation still work.

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

## Running your own Unkey server in production (EC2)

The `docker-compose.yml` above is a local-only dev harness. Amplify (or any
other host for the Next.js app) only runs the app itself — it cannot run
this multi-container stack — so if you want to self-host Unkey instead of
using Unkey Cloud, run it separately, e.g. on a small EC2 instance.

1. **Launch an instance.** Ubuntu 24.04, `t3.small` or larger. Security
   group: allow inbound `22` (SSH, restrict to your IP), `80` and `443`
   (from anywhere — needed for Caddy + Let's Encrypt and for API traffic).
   Do **not** open `3306`, `6379`, or `8080` — the prod compose file below
   keeps those internal. Allocate an Elastic IP and point a DNS record
   (e.g. `unkey.yourdomain.com`) at it.

2. **Install Docker** on the instance:

   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker "$USER"
   ```

   (log out/in for the group change to apply)

3. **Get the repo and the pinned Unkey schema assets** on the instance:

   ```bash
   git clone <this-repo-url> quiz-generator && cd quiz-generator
   bash scripts/setup-unkey-assets.sh
   ```

4. **Create `.env.unkey.prod`** (kept off git, root-only permissions):

   ```bash
   cat > .env.unkey.prod <<'EOF'
   MYSQL_ROOT_PASSWORD=<generate a long random secret>
   UNKEY_DOMAIN=unkey.yourdomain.com
   EOF
   chmod 600 .env.unkey.prod
   ```

5. **Start the stack** (`docker-compose.prod.yml` disables the MySQL/Redis
   host ports, adds `restart: unless-stopped`, and fronts Unkey with Caddy
   for automatic HTTPS):

   ```bash
   docker compose --env-file .env.unkey.prod -f docker-compose.prod.yml up -d
   ```

6. **Seed the schema and mint a root key**, same as local dev but with the
   real password in scope:

   ```bash
   set -a; source .env.unkey.prod; set +a
   bash scripts/bootstrap-unkey.sh .unkey.env.prod
   ```

   This writes `UNKEY_ROOT_KEY` and `UNKEY_API_ID` to `.unkey.env.prod`.
   Treat that file as a secret (`chmod 600`, never commit it).

7. **Point your app at it.** In your app host's environment settings
   (e.g. the Amplify Console), set:

   ```
   UNKEY_SERVER_URL=https://unkey.yourdomain.com
   UNKEY_ROOT_KEY=<value from .unkey.env.prod>
   UNKEY_API_ID=<value from .unkey.env.prod>
   ```

   No code changes are needed — `lib/unkey.ts` already reads these from
   the environment.

8. **Operational follow-ups** worth doing before relying on this in
   production:
   - Back up the `unkey_mysql_data` volume (cron `mysqldump` to S3, or an
     EBS snapshot schedule via AWS Backup).
   - Watch disk space/health (`docker compose -f docker-compose.prod.yml ps`,
     CloudWatch agent, or a simple uptime check against
     `https://unkey.yourdomain.com/v2/liveness`).
   - Pin and periodically bump the `ghcr.io/unkeyed/unkey` image tag
     alongside `scripts/setup-unkey-assets.sh`'s `UNKEY_VERSION` so the
     schema assets and the running image stay in sync.

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
