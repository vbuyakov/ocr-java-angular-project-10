# Support chat — base flow (CU ↔ AU) and WebSocket usage

This document describes the **product flow** for the support chat UI. The **normative API** (REST paths, STOMP destinations, payloads) is in [`support_chat_web_socket_api_spec_clean.md`](support_chat_web_socket_api_spec_clean.md) and the short reference [`support_chat_api_endpoints.md`](support_chat_api_endpoints.md).

---

## Customer (CU)

1. CU logs in (e.g. `cust1`). Support area has two main areas: **live chat** and **archived requests**.

2. CU opens the **support/chat** page.

3. **REST — resolve or create the active chat (one non-closed chat per CU):**
   - Call **`GET /api/chat/active`**.
   - If **200**: use returned `chatId` / `status` (existing active chat).
   - If **404**: there is no active chat — UI prompts for the **first message**, then CU calls **`POST /api/chat/active`** with body `{ "initialMessage": "…" }`. That creates the chat **and** persists the first message. If **409**, an active chat already exists (refresh state with GET).

4. **WebSocket:** After CU has a `chatId` (from step 3), open the STOMP session (e.g. connect to `/ws` with JWT, then subscribe to `/topic/chat/{chatId}` and user queues as per spec). *Exact order vs REST may vary (connect WS early after login vs only after `chatId` exists); the thread subscription must target the current `chatId`.*

5. Optionally load history with **`GET /api/chat/{chatId}/messages`** (reload, scroll).

---

## Agent (AU)

6. AU logs in (e.g. `agent1`).

7. **WebSocket:** AU connects to `/ws` so they receive **chat list updates** (`/user/queue/chats`, etc.) and can receive events for chats they follow — including when not on the chat detail page.

8. **REST:** AU hydrates inbox tabs with **`GET /api/agent/chats?bucket=…`** (e.g. `NEW_REQUESTS`, `MY_ACTIVE`, `OTHERS_ACTIVE`, `ARCHIVED`) plus pagination.

9. AU **support** UI: separate views for **my active chats**, **chat requests** (no agent assigned yet), **other agents’ active chats**, and **archived**.

10. When a CU **creates** a new chat (POST with initial message), **chat request** lists for agents update (via **`CHAT_LIST_UPDATED`** / refresh — see canonical spec).

11. AU **opens** a request and **attaches** (STOMP **`/app/chat.attach`**) — chat becomes **ACTIVE** with `agent_id` set; both sides can use the thread. **My chats** / **chat requests** / **other agents’** lists update for relevant AUs; CU sees agent connection via WS (e.g. presence / status events per spec).

12. **Typing:** CU or AU sends debounced **`/app/chat.typing`**; the other side shows “typing…” in UI (debounce on client; do not send on every keypress).

13. **Send / edit / delete message:** Commands under `/app/chat.send`, `…/edit`, `…/delete`; events on `/topic/chat/{chatId}`. On failure, show error (including **`/user/queue/errors`** where applicable). **Edit/delete** only by **message creator**; edited/deleted copy as in spec.

14. **Presence:** On disconnect / reconnect, propagate **USER_LEFT** / **USER_JOINED** (or spec equivalents) so UI can show “… left” / “… connected” with timestamp.

15. **Close chat:** CU or AU closes via **`/app/chat.close`**; **CHAT_STATUS** `CLOSED`; move to **archive** in UI for both participants and refresh agent lists for other agents.

---

## Alignment notes (avoid drift)

| Topic | This doc (narrative) | Canonical / implementation |
|--------|----------------------|----------------------------|
| Chat lifecycle | Older drafts mentioned ATTACHED/DETACHED/ARCHIVED | **`Chat.status`:** `NEW` \| `ACTIVE` \| `CLOSED` (see spec). “Archived” in UI = **CLOSED** chats. |
| User model | “type CLIENT \| AGENT” | JPA uses **`User.role`** (`CLIENT` / `AGENT`). |
| Messages | Draft had `senderType`, message status NEW/READ/CHANGED | Implementation: **`sender_id`** FK; **`ChatMessageStatus`** `ACTIVE` \| `DELETED`; **edited** flag. |

---

## Database sketch (conceptual — see JPA entities / Flyway for truth)

```
User
----
id uuid PK
username, email, password
role: CLIENT | AGENT   -- stored as string enum
...

Chat
----
id uuid PK
client_id  → User (required)
agent_id   → User (nullable)
status     NEW | ACTIVE | CLOSED
created_at, updated_at
...

ChatMessage
-------------
id uuid PK
chat_id    → Chat
sender_id  → User
content    varchar(1000)
status     ACTIVE | DELETED
created_at, updated_at
edited     boolean
```

---

## Typos fixed (historical)

Earlier versions had “Sturcture”, “recieve”, “Aagent1”, “automativally”; the flow above supersedes that wording.
