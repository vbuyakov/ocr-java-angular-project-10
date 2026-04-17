# Support Chat (CU ↔ AU) — WebSocket + REST API Specification

## Roles

- CU (Customer User)
- AU (Agent User)

---

# 1. Connection Model

- Single WebSocket endpoint:

  - `/ws`

- STOMP destinations:

  - Client → Server: `/app/*`
  - Server → Client (chat): `/topic/chat/{chatId}`
  - Server → Client (user): `/user/queue/*`

---

# 2. REST API

REST endpoints hydrate the UI on **cold load**, **full page reload**, and **reconnect**; WebSocket events keep lists and threads live afterward.

## Chat summary (shared shape)

List endpoints return items with a common summary shape (exact fields may include optional last-message preview):

```
{
  "chatId": "uuid",
  "status": "NEW | ACTIVE | CLOSED",
  "clientId": "uuid",
  "agentId": "uuid | null",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## Get Active Chat (CU)

GET `/api/chat/active`

Returns the CU’s single non-closed chat. **404** if none (UI then collects an initial message and calls POST).

Response:

```
{
  "chatId": "uuid",
  "status": "NEW | ACTIVE | CLOSED"
}
```

## Create Active Chat with Initial Message (CU)

POST `/api/chat/active`

Creates a new non-closed chat and **persists the first message** (required). One active chat per CU — **409 Conflict** if a non-closed chat already exists.

Request body:

```
{
  "initialMessage": "string"
}
```

Response: same shape as GET (`chatId`, `status`).

## List Archived Chats (CU)

GET `/api/chat/archived`

Returns **closed** chats for the authenticated CU (newest first).

Query parameters (optional):

- `page`, `size` — offset pagination; or
- `cursor`, `limit` — cursor pagination if preferred

Response:

```
{
  "items": [ { /* chat summary */ } ],
  "hasMore": boolean,
  "nextCursor": "string | null"
}
```

(Adjust `page`/`size` vs `cursor` to one style in implementation; document the chosen pattern in OpenAPI.)

## List Chats (AU)

GET `/api/agent/chats`

Returns chats visible to agents, filtered by **bucket** (exactly one per request).

Query parameters:

- `bucket` (required):
  - `NEW_REQUESTS` — `status = NEW` and `agentId` is null (unassigned queue)
  - `MY_ACTIVE` — `status = ACTIVE` and `agentId` = current AU
  - `OTHERS_ACTIVE` — `status = ACTIVE` and `agentId` is another non-null agent
  - `ARCHIVED` — `status = CLOSED`
- Pagination: same as CU archived (`page`/`size` or `cursor`/`limit`)

Response:

```
{
  "items": [ { /* chat summary */ } ],
  "hasMore": boolean,
  "nextCursor": "string | null"
}
```

## Get Chat Messages

GET `/api/chat/{chatId}/messages`

Loads full message history for a chat the caller may access: **initial open**, **page reload**, **opening an archived chat**, and **infinite scroll** (older messages).

Authorization: **participants only**; permitted when chat is **ACTIVE** or **CLOSED**.

Query parameters (optional):

- `limit` — default (e.g. 50), cap (e.g. 200)
- `before` — message id: return messages **strictly older** than this (load older / scroll up)
- `after` — message id: return messages **strictly newer** than this (catch-up after reconnect)

Response:

```
{
  "messages": [
    {
      "id": "uuid",
      "chatId": "uuid",
      "senderId": "uuid",
      "senderUsername": "string",
      "content": "string",
      "status": "ACTIVE | DELETED",
      "createdAt": "datetime",
      "updatedAt": "datetime",
      "edited": boolean
    }
  ],
  "hasMore": boolean
}
```

Messages are ordered by `createdAt` ascending within the returned window.

---

# 3. WebSocket Commands (Client → Server)

## Send Message

Destination: `/app/chat.send`

```
{
  "chatId": "uuid",
  "clientMessageId": "uuid",
  "content": "string"
}
```

## Edit Message

Destination: `/app/chat.edit`

```
{
  "chatId": "uuid",
  "messageId": "uuid",
  "content": "string"
}
```

## Delete Message

Destination: `/app/chat.delete`

```
{
  "chatId": "uuid",
  "messageId": "uuid"
}
```

## Attach Agent

Destination: `/app/chat.attach`

```
{
  "chatId": "uuid"
}
```

## Detach User

Destination: `/app/chat.detach`

```
{
  "chatId": "uuid"
}
```

## Close Chat

Destination: `/app/chat.close`

```
{
  "chatId": "uuid"
}
```

## Typing Indicator

Destination: `/app/chat.typing`

```
{
  "chatId": "uuid"
}
```

---

# 4. WebSocket Events (Server → Client)

Destination: `/topic/chat/{chatId}`

## Message Created
```

{
  "type": "MESSAGE_CREATED",
  "chatId": "uuid",
  "clientMessageId": "uuid",
  "message": {
    "id": "uuid",
    "chatId": "uuid",
    "senderId": "uuid",
    "senderUsername": "string",
    "content": "string",
    "status": "ACTIVE | DELETED",
    "createdAt": "datetime",
    "updatedAt": "datetime",
    "edited": boolean
  }
}

```

## Message Updated
```

{ "type": "MESSAGE\_UPDATED", "chatId": "uuid", "messageId": "uuid", "content": "string", "updatedAt": "datetime" }

```

## Message Deleted
```

{ "type": "MESSAGE\_DELETED", "chatId": "uuid", "messageId": "uuid", "updatedAt": "datetime" }

```

## Chat Status Changed

```
{
  "type": "CHAT_STATUS",
  "chatId": "uuid",
  "status": "NEW | ACTIVE | CLOSED"
}
```

## User Presence

```
{
  "type": "USER_JOINED | USER_LEFT",
  "chatId": "uuid",
  "userId": "uuid",
  "timestamp": "datetime"
}
```

## Typing

```
{
  "type": "TYPING",
  "chatId": "uuid",
  "userId": "uuid"
}
```

---

# 5. User Events (Server → Specific User)

Destination: `/user/queue/chats`

## Chat List Update

```
{
  "type": "CHAT_LIST_UPDATED"
}
```

---

# 6. Error Events

Destination: `/user/queue/errors`

```
{
  "type": "ERROR",
  "code": "VALIDATION_ERROR | ACCESS_DENIED | CHAT_CLOSED | MESSAGE_NOT_FOUND",
  "message": "string",
  "clientMessageId": "uuid"
}
```

---

# 7. Database Model

## User

```
id: uuid
username: string
email: string
type: CLIENT | AGENT
```

## Chat

```
id: uuid
clientId: uuid
agentId: uuid (nullable)
status: NEW | ACTIVE | CLOSED
createdAt: datetime
updatedAt: datetime
```

## ChatMessage

```
id: uuid
chatId: uuid
senderId: uuid
content: string
status: ACTIVE | DELETED
createdAt: datetime
updatedAt: datetime
edited: boolean
```

---

# 8. Rules

- One active chat per CU
- Only message creator can edit/delete
- Only participants can access chat
- Messages are ordered by createdAt
- Server time is source of truth
- All actions: command → DB → event
- After reload or reconnect: **REST** (`GET` lists + `GET` messages) restores state; **WS** subscriptions stay authoritative for live updates

---

# 9. Behavior Flow

## CU Flow

1. CU logs in and opens `support/chat`.
2. Frontend connects to `/ws` with authenticated user context.
3. Frontend calls `GET /api/chat/active` and, for archive sidebar, `GET /api/chat/archived`.
4. If active chat exists (200), frontend uses returned `chatId`.
5. If no active chat (404), UI prompts for an initial message and CU calls `POST /api/chat/active` with `{ "initialMessage": "…" }` (409 if a non-closed chat already exists).
6. Frontend calls `GET /api/chat/{chatId}/messages` to load the thread (reload or open archived chat uses the same endpoint).
7. Frontend subscribes to `/topic/chat/{chatId}`.
8. CU can send messages, edit own messages, delete own messages,
9. CU receives real-time events:
   - new message
   - message updated
   - message deleted
   - typing
   - agent attached
   - agent detached
   - chat closed
10. When AU attaches, CU UI shows that agent is connected with timestamp.
11. When AU types, CU UI shows typing indicator.
12. When AU disconnects or reconnects, CU UI shows presence event with timestamp.
13. When chat is closed, UI moves chat from active chat to archive.

## AU Flow

1. AU logs in and opens support area.
2. Frontend connects to `/ws` with authenticated user context.
3. Frontend calls `GET /api/agent/chats` once per visible bucket (`NEW_REQUESTS`, `MY_ACTIVE`, `OTHERS_ACTIVE`, `ARCHIVED`) to hydrate after load or reload.
4. AU subscribes to `/user/queue/chats`.
5. AU UI shows:
   - my active chats
   - chat requests without assigned AU
   - active chats assigned to other AUs
   - archived chats
6. When CU creates a new chat, all relevant AU UIs receive chat list update event.
7. AU sees new chat request in real time.
8. AU opens selected chat, calls `GET /api/chat/{chatId}/messages`, then sends `/app/chat.attach`.
9. Frontend subscribes to `/topic/chat/{chatId}`.
10. After attach:
   - selected AU sees chat messages and status updates
   - CU receives agent attached event
   - other AU users receive chat list update event
11. AU can send messages, edit own messages, delete own messages,
12. If AU is not currently on chat page, AU can still receive personal chat list updates through `/user/queue/chats`.
13. When CU disconnects or reconnects, AU UI shows presence event with timestamp.
14. When chat is closed, UI removes chat from active/request lists and moves it to archive.

## Message Behavior

1. Sending message:
   - client sends command
   - server validates command and permissions
   - server persists message
   - server broadcasts `MESSAGE_CREATED`
   - sender and recipient both receive same canonical event
2. Editing message:
   - only message creator can edit
   - server updates content and marks message as edited
   - server broadcasts `MESSAGE_UPDATED`
   - UI shows `Edited <datetime>`
3. Deleting message:
   - only message creator can delete
   - server clears content and marks message deleted
   - server broadcasts `MESSAGE_DELETED`
   - UI shows `Deleted <datetime>`
4. Typing:
   - client sends debounced typing command
   - server broadcasts `TYPING`
   - recipient UI shows temporary typing indicator
   - client sends debounced typing command
   - server broadcasts `TYPING`
   - recipient UI shows temporary typing indicator

## Presence Behavior

1. Attach means user joins active participation in chat.
2. Detach means user leaves active participation in chat but chat remains open.
3. Disconnect or reconnect events must be propagated to the other participant as `USER_LEFT` and `USER_JOINED`.
4. Presence events are informational and do not archive or close the chat.

## Close Behavior

1. CU or AU sends `/app/chat.close`.
2. Server validates permission.
3. Server sets chat status to `CLOSED`.
4. Server broadcasts `CHAT_STATUS` with `CLOSED`.
5. CU, AU, and relevant AU chat lists update UI.
6. Closed chat is shown in archive and removed from active/request lists.

# 10. Constraints

- Typing events must be debounced
- WS reconnect must restore subscriptions; after reconnect, optionally **refetch** `GET /api/agent/chats` / `GET /api/chat/archived` and `GET /api/chat/{chatId}/messages?after=…` to fill gaps
- No business logic without persistence

