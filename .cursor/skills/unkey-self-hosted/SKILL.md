---
name: unkey-self-hosted
description: Guide for working with the self-hosted Unkey API key system in this project. Use when creating API keys, managing key ownership, setting up Unkey locally, or understanding how ownerId maps to questions.
disable-model-invocation: true
---

# Unkey Self-Hosted — Project Guide

Unkey runs locally via Docker Compose (`docker compose up -d`), exposing the API at `http://localhost:8080`. No cloud account is needed.

## How ownerId Works

In Unkey v2, "who owns a key" is expressed through **identities**. The `identity.externalId` field is what this project uses as `ownerId` — it flows from key creation all the way to Firestore question documents.

### 1. Create an identity

```bash
POST http://localhost:8080/v2/identities.createIdentity
{
  "externalId": "alice"   # your chosen identifier — username, user ID, etc.
}
```

### 2. Create a key linked to that identity

```bash
POST http://localhost:8080/v2/keys.createKey
{
  "apiId": "api_...",
  "externalId": "alice"
}
```

### 3. What happens on verification

When Alice sends a request with her key, `verifyApiKey()` in `lib/unkey.ts` calls Unkey and reads:

```
data.identity.externalId  →  "alice"  →  ownerId
```

That `"alice"` string is stamped on every question she creates (`ownerId` field in Firestore) and is used to filter searches and ownership checks.

## Fallback behavior

If a key has no linked identity, `verifyApiKey()` falls back to `data.keyId` (Unkey's internal ID like `key_abc123`). Questions are still owned, just identified by key ID instead of a human-readable name.

## Ownership rules in this project

| Route | Behavior |
|-------|----------|
| `POST /api/question` | stamps caller's `ownerId` on the new question |
| `GET /api/question/:id` | 403 if `question.ownerId !== caller's ownerId` |
| `GET /api/question/search` | returns only questions owned by the caller |
| `POST /api/quiz` | requires all `questionIds` to be owned by the caller |
| `POST /api/question/:id/attempt` | public — no key required |
| `GET /api/quiz/:id` | public — no key required |

## Environment variables

```
UNKEY_SERVER_URL=http://localhost:8080
UNKEY_ROOT_KEY=unkey_...      # root key from the local Unkey instance
UNKEY_API_ID=api_...          # the API ID whose keys are considered valid
```
