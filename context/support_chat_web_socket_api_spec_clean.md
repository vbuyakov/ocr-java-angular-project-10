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

## Get or Create Active Chat (CU)

POST `/api/chat/active`

Response:

```
{
  "chatId": "uuid",
  "status": "NEW | ACTIVE | CLOSED"
}
```

## Get Chat Messages

GET `/api/chat/{chatId}/messages`

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

{ "chatId": "uuid", "messageId": "uuid" }

```

## Attach Agent
Destination: `/app/chat.attach`
```

{ "chatId": "uuid" }

```

## Detach User
Destination: `/app/chat.detach`
```

{ "chatId": "uuid" }

```

## Close Chat
Destination: `/app/chat.close`
```

{ "chatId": "uuid" }

```

## Typing Indicator
Destination: `/app/chat.typing`
```

{ "chatId": "uuid" }

```

---

# 4. WebSocket Events (Server → Client)

Destination: `/topic/chat/{chatId}`

## Message Created
```

{ "type": "MESSAGE\_CREATED", "chatId": "uuid", "clientMessageId": "uuid", "message": { "id": "uuid", "senderId": "uuid", "content": "string", "status": "ACTIVE", "createdAt": "datetime", "updatedAt": "datetime" } }

```

## Message Updated
```

{ "type": "MESSAGE\_UPDATED", "chatId": "uuid", "messageId": "uuid", "content": "string", "updatedAt": "datetime" }

```

## Message Deleted
```

{ "type": "MESSAGE\_DELETED", "chatId": "uuid", "messageId": "uuid", "updatedAt": "datetime" }

```


{
  "type": "MESSAGE_READ",
  "chatId": "uuid",
  "messageId": "uuid",
  "readAt": "datetime"
}
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

---

# 9. Behavior Flow

## CU Flow

1. CU logs in and opens `support/chat`.
2. Frontend connects to `/ws` with authenticated user context.
3. Frontend calls `POST /api/chat/active`.
4. If active chat exists, frontend uses returned `chatId`.
5. If no active chat exists, UI proposes creating a new chat.
6. CU creates new chat with initial message.
7. Frontend subscribes to `/topic/chat/{chatId}`.
8. CU can send messages, edit own messages, delete own messages,
9. CU receives real-time events:
   - new message
   - message updated
   - message deleted
   -
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
3. AU subscribes to `/user/queue/chats`.
4. AU UI shows:
   - my active chats
   - chat requests without assigned AU
   - active chats assigned to other AUs
   - archived chats
5. When CU creates a new chat, all relevant AU UIs receive chat list update event.
6. AU sees new chat request in real time.
7. AU opens selected chat and sends `/app/chat.attach`.
8. Frontend subscribes to `/topic/chat/{chatId}`.
9. After attach:
   - selected AU sees chat messages and status updates
   - CU receives agent attached event
   - other AU users receive chat list update event
10. AU can send messages, edit own messages, delete own messages,
11. If AU is not currently on chat page, AU can still receive personal chat list updates through `/user/queue/chats`.
12. When CU disconnects or reconnects, AU UI shows presence event with timestamp.
13. When chat is closed, UI removes chat from active/request lists and moves it to archive.

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
- WS reconnect must restore subscriptions
- No business logic without persistence

