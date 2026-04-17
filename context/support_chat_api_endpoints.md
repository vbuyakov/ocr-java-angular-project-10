# Support Chat — REST & WebSocket quick reference

Companion to `support_chat_web_socket_api_spec_clean.md` (full specification).

**Roles:** CU = Customer User, AU = Agent User.

---

## REST endpoints

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| GET | `/api/chat/active` | CU | Current non-closed chat, or **404** if none |
| POST | `/api/chat/active` | CU | Body `{ "initialMessage": "…" }` — create chat + first message; **409** if active chat exists |
| GET | `/api/chat/archived` | CU | List archived (closed) chats — query: `page`/`size` or `cursor`/`limit` |
| GET | `/api/agent/chats` | AU | List chats — **required** query `bucket`: `NEW_REQUESTS` \| `MY_ACTIVE` \| `OTHERS_ACTIVE` \| `ARCHIVED`; pagination as above |
| GET | `/api/chat/{chatId}/messages` | Participant | Load thread (reload, archived chat, infinite scroll) — query: `limit`, `before`, `after` |

---

## WebSocket connection

| | |
|--|--|
| URL | `/ws` |

**STOMP routing**

| Direction | Prefix / pattern |
|------------|------------------|
| Client → Server | `/app/*` |
| Server → Client (chat room) | `/topic/chat/{chatId}` |
| Server → Client (user-specific) | `/user/queue/*` |

---

## WebSocket actions (client → server)

| Destination | Action | Body (summary) |
|-------------|--------|----------------|
| `/app/chat.send` | Send message | `chatId`, `clientMessageId`, `content` |
| `/app/chat.edit` | Edit message | `chatId`, `messageId`, `content` |
| `/app/chat.delete` | Delete message | `chatId`, `messageId` |
| `/app/chat.attach` | Attach agent | `chatId` |
| `/app/chat.detach` | Detach user | `chatId` |
| `/app/chat.close` | Close chat | `chatId` |
| `/app/chat.typing` | Typing indicator | `chatId` |

---

## WebSocket events (server → client)

**Topic:** `/topic/chat/{chatId}`

| Event type (payload `type`) | Notes |
|----------------------------|--------|
| `MESSAGE_CREATED` | Includes `message` object |
| `MESSAGE_UPDATED` | |
| `MESSAGE_DELETED` | |
| `CHAT_STATUS` | `status`: NEW \| ACTIVE \| CLOSED |
| `USER_JOINED` / `USER_LEFT` | Presence |
| `TYPING` | |

**User queue:** `/user/queue/chats`

| Event | Payload |
|-------|---------|
| Chat list refresh | `{ "type": "CHAT_LIST_UPDATED" }` |

**User queue:** `/user/queue/errors`

| Event | Payload |
|-------|---------|
| Error | `{ "type": "ERROR", "code": "…", "message": "…", "clientMessageId": "uuid" }` |

`code` values include: `VALIDATION_ERROR`, `ACCESS_DENIED`, `CHAT_CLOSED`, `MESSAGE_NOT_FOUND`.
