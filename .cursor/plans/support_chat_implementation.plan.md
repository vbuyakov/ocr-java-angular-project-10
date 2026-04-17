---
name: Support chat implementation
overview: Step-by-step **backend** plan for the support chat feature under `com.ycyw.api.tchat` (Angular UI is a **separate plan**). Aligned with [context/support_chat_api_endpoints.md](context/support_chat_api_endpoints.md) and the full spec. Each phase ends with explicit review checkpoints. Canonical copy lives at [.cursor/plans/support_chat_implementation.plan.md](.cursor/plans/support_chat_implementation.plan.md).
todos:
  - id: phase-0-authorities
    content: "Phase 0: Fix User.getAuthorities() for ROLE_CLIENT / ROLE_AGENT; verify JwtAuthenticationFilter principal"
    status: completed
  - id: phase-1-db-repo
    content: "Phase 1: Flyway migrations + ChatRepository + ChatMessageRepository (bucket + pagination queries)"
    status: completed
  - id: phase-2-access
    content: "Phase 2: ChatAccessService + document agent-read-before-attach rule"
    status: completed
  - id: phase-3-rest
    content: "Phase 3: REST DTOs + ChatRestController + AgentChatRestController (incremental endpoints)"
    status: completed
  - id: phase-4-ws-infra
    content: "Phase 4: WebSocket/STOMP config + JWT handshake + SUBSCRIBE interceptor"
    status: completed
  - id: phase-5-stomp
    content: "Phase 5: ChatStompController for all /app/chat.* commands"
    status: completed
  - id: phase-6-broadcast
    content: "Phase 6: SimpMessagingTemplate events to topic and user queues"
    status: completed
  - id: phase-7-unit-tests
    content: "Phase 7: Unit tests + slice tests (Mockito; @WebMvcTest, @DataJpaTest, WS mocked)"
    status: completed
  - id: phase-8-e2e-tests
    content: "Phase 8: E2E tests (full Spring context, HTTP API, DB, STOMP/WebSocket flows)"
    status: pending
  - id: save-plan-md
    content: "Optional: copy plan to context/support_chat_implementation_plan.md if you want a second copy under context/"
    status: pending
isProject: true
---

# Support chat — step-by-step implementation plan

**Goal:** Implement REST + STOMP WebSocket for support chat with **role** (CLIENT vs AGENT) and **participant/owner** checks, organized under [`api/src/main/java/com/ycyw/api/tchat/`](api/src/main/java/com/ycyw/api/tchat/). **Frontend (Angular)** is out of scope here — tracked in a **separate plan**.

**Spec references:** [context/support_chat_web_socket_api_spec_clean.md](context/support_chat_web_socket_api_spec_clean.md), [context/support_chat_api_endpoints.md](context/support_chat_api_endpoints.md).

**Deliverable document:** This file — **[`.cursor/plans/support_chat_implementation.plan.md`](.cursor/plans/support_chat_implementation.plan.md)** — is the project-local checklist (version with git if `.cursor/` is tracked).

**Testing — mocking:** Use **Mockito** for unit and slice tests (`@Mock`, `@InjectMocks`, `when` / `verify`, `@ExtendWith(MockitoExtension.class)` with JUnit). `@DataJpaTest` / `@SpringBootTest` E2E use real beans or Testcontainers — not Mockito for the persistence layer unless testing a thin wrapper.

---

## Current codebase facts (constraints)

- [`User`](api/src/main/java/com/ycyw/api/user/model/User.java) has `Role.CLIENT` / `Role.AGENT` but **`getAuthorities()` returns an empty list** — `@PreAuthorize("hasRole('CLIENT')")` will **not** work until authorities emit `ROLE_CLIENT` / `ROLE_AGENT` (e.g. `SimpleGrantedAuthority("ROLE_" + role.name())`).
- [`SecurityConfig`](api/src/main/java/com/ycyw/api/config/SecurityConfig.java) uses `@EnableMethodSecurity` and JWT filter on the main API chain; WebSocket handshake for `/ws` must be **explicitly** secured and wired to JWT (see Phase 4).
- [`Chat`](api/src/main/java/com/ycyw/api/tchat/model/Chat.java) already maps `client`, `agent`, `status` — good fit for participant checks.

```mermaid
flowchart LR
  subgraph http [REST]
    JWT[JwtAuthenticationFilter]
    Ctrl[RestControllers]
    Svc[ChatService + ChatAccessService]
    JWT --> Ctrl --> Svc
  end
  subgraph ws [WebSocket]
    Handshake[WS handshake auth]
    Interceptor[ChannelInterceptor SUBSCRIBE]
    Stomp[StompController]
    Handshake --> Interceptor --> Stomp --> Svc
  end
```

---

## Recommended package layout (`tchat`)

| Package | Contents |
|---------|----------|
| `tchat.model` | Existing entities; add DTOs only if you prefer co-location, else `tchat.dto` |
| `tchat.repository` | `ChatRepository`, `ChatMessageRepository` (Spring Data) |
| `tchat.service` | `ChatService`, `ChatMessageService`, **`ChatAccessService`** (participant + role rules) |
| `tchat.web.rest` | `ChatRestController` (`/api/chat/**`), `AgentChatRestController` (`/api/agent/chats`) |
| `tchat.web.ws` | `ChatStompController` (`@MessageMapping` for `/app/chat.*`), optional `StompExceptionHandler` |
| `tchat.config` | `WebSocketSecurityConfig`, `WebSocketConfig` (broker, app prefix, user destination prefix) |

**Rule:** Controllers are **thin**; **all** `chatId` operations call **`ChatAccessService`** (or services that delegate to it) so REST and WS stay consistent.

---

## Phase 0 — Security foundation (small, mandatory review)

**What:** Fix `User.getAuthorities()` to return `ROLE_CLIENT` / `ROLE_AGENT`.

**Why:** Enables `@PreAuthorize` on REST and (once STOMP security context is set) on `@MessageMapping`.

**Review checkpoint:** Open `User.java`, confirm one authority per user matches JWT-loaded principal used in [`JwtAuthenticationFilter`](api/src/main/java/com/ycyw/api/security/jwt/JwtAuthenticationFilter.java).

---

## Phase 1 — Database and repositories

**What:**

- Ensure tables for `chats` and `chat_messages` match entities ([`ChatMessage`](api/src/main/java/com/ycyw/api/tchat/model/ChatMessage.java) if present). Prefer **Flyway** migration in [`api/src/main/resources/db/migration/`](api/src/main/resources/db/migration/) (project has Flyway enabled) instead of relying only on `ddl-auto` for production-shaped work.
- Add `ChatRepository` with queries for:
  - CU: one non-closed chat by `client_id`; archived list by `client_id` + `CLOSED`.
  - AU: four **bucket** queries (or one dynamic query) matching spec: `NEW_REQUESTS`, `MY_ACTIVE`, `OTHERS_ACTIVE`, `ARCHIVED`.
- Add `ChatMessageRepository` with pagination by `chatId`, `createdAt`, and optional cursor (`before`/`after` message id).

**Review checkpoint:** Review SQL / JPQL only — indexes on `(chat_id, created_at)` for messages; understand each bucket predicate in plain language.

---

## Phase 2 — `ChatAccessService` (participant + role)

**What:** Single place for:

- `validateParticipant(chatId, userId)` — load chat, allow if user is **client** or **assigned agent** on that chat.
- `validateClient(chatId, userId)` — must be the chat **customer** (`client_id`).
- `validateAgent(chatId, userId)` — must be the **assigned agent** (`agent_id`); fails while `agent_id` is null (unassigned-chat / attach flows use `ChatService` + role, not this).

**TODO — recheck after Phase 3–5 (also in `ChatAccessService` Javadoc + `// TODO` in code):**

- Revisit whether `validateParticipant` stays or call sites use `isParticipant` + throw only.
- Revisit `validateClient` / `validateAgent` usage per endpoint; simplify if redundant.
- Wire `ChatService` attach / unassigned-chat rules; confirm no gap vs `ChatAccessService`.
- Re-run auth matrix tests (REST + STOMP SUBSCRIBE).

**Review checkpoint:** Walk through matrix: CLIENT accessing another client’s chat → **deny**; AGENT accessing unassigned chat for **read** (messages) only if product allows — align with spec (“only participants”); typically **attach** before agent is participant — **decide explicitly:** either allow agents to read **NEW_REQUESTS** only via list + attach flow, or allow message read after attach only. Document the chosen rule in code comments (one short paragraph).

---

## Phase 3 — REST API (incremental)

Implement in **small PR-sized chunks**, each reviewable alone:

1. **DTOs + mappers** — request/response types for active chat, archived list, agent list, message page.
2. **`POST /api/chat/active`** — `@PreAuthorize` CLIENT; enforce “one active chat per CU” in service.
3. **`GET /api/chat/archived`** — CLIENT; scoped to current user’s closed chats.
4. **`GET /api/agent/chats`** — AGENT; required `bucket` query param; pagination.
5. **`GET /api/chat/{chatId}/messages`** — participant; `limit` / `before` / `after`; ACTIVE or CLOSED.

**Review checkpoint:** For each endpoint: Swagger annotation, controller **only** delegates, service contains business rules, `ChatAccessService` used for `{chatId}` paths.

**TODO:** Revisit whether manual [`ChatMapper`](api/src/main/java/com/ycyw/api/tchat/dto/ChatMapper.java) is enough or **MapStruct** should be added when DTO/mapping volume grows.

---

## Phase 4 — WebSocket infrastructure

**What:**

- Register STOMP endpoint `/ws` (SockJS optional per frontend).
- Configure `ApplicationDestinationPrefixes` `/app`, `UserDestinationPrefix` `/user`, broker prefix `/topic`.
- **Handshake security:** Allow handshake URL (e.g. `/ws/**`) on a filter chain that accepts JWT (header or **query parameter** for browser WebSocket if needed) and establishes `SecurityContext` before STOMP CONNECT.
- **Inbound `ChannelInterceptor`:** On **CONNECT**, ensure principal is set; on **SUBSCRIBE** to `/topic/chat/{chatId}`, parse `chatId` and call `ChatAccessService` — reject subscription if not participant.

**Review checkpoint:** Trace one SUBSCRIBE with a wrong `chatId` → must fail before any event is received.

---

## Phase 5 — STOMP command handlers

**What:** `@MessageMapping` methods for `/app/chat.send`, `.edit`, `.delete`, `.attach`, `.detach`, `.close`, `.typing` — each payload DTO, delegate to same services as REST where overlap exists (send/edit/delete/close).

**Review checkpoint:** Each handler: principal from `SecurityContext`, `chatId` validated, same permission rules as REST.

---

## Phase 6 — Broadcasting

**What:** Use `SimpMessagingTemplate` to send to `/topic/chat/{chatId}` and `/user/queue/chats`, `/user/queue/errors` per spec event types (`MESSAGE_CREATED`, etc.).

**Review checkpoint:** One integration-style test or manual script: two users, subscribe, send message, both receive canonical event.

---

## Phase 7 — Unit tests and slice tests

**What:**

- **Mocking library:** **Mockito** for all collaborators (repositories, `SimpMessagingTemplate`, `ChatAccessService`, etc.) in true unit tests and in controller/handler tests that inject mocks.
- **Unit tests (pure / Mockito):** `ChatAccessService`, mappers, STOMP command handlers’ permission branches with `@Mock` `ChatRepository` / peers; `verify` interactions where it matters.
- **`@DataJpaTest`:** Repository methods — bucket queries, message pagination (`before` / `after`), indexes — **real** JPA + DB (no Mockito for the repository under test).
- **`@WebMvcTest`:** REST controllers — `@MockBean` services or Mockito mocks; status codes, JSON shape, `@PreAuthorize` with `@WithMockUser` / custom security context for CLIENT vs AGENT.
- **WebSocket slice:** `ChannelInterceptor` SUBSCRIBE denial, or `@MessageMapping` unit tests with Mockito-mocked `SimpMessagingTemplate` / services where practical.

**Review checkpoint:** Coverage matrix: forbidden cross-tenant chat, agent bucket isolation, closed-chat message read, wrong role on `/api/agent/chats` vs `/api/chat/*`.

---

## Phase 8 — E2E tests (backend)

**What:** End-to-end tests that boot **Spring Boot** with a real or containerized **PostgreSQL** (recommended: **Testcontainers** if the project adopts it; otherwise embedded DB + Flyway test migrations — align with how [`api`](api) is configured).

- **`@SpringBootTest` + `WebEnvironment.RANDOM_PORT`:** `TestRestTemplate` or `RestClient` — full HTTP: register/login → JWT → `POST /api/chat/active`, `GET` lists, `GET` messages, 403/401 paths.
- **STOMP E2E:** `WebSocketStompClient` (or similar) against `ws://localhost:{port}/ws` — CONNECT with JWT, SUBSCRIBE to `/topic/chat/{chatId}`, SEND to `/app/chat.send`, assert events on topic and `/user/queue/*` as applicable.
- **Fixtures:** Reusable builders for `User` (CLIENT/AGENT), `Chat`, messages; cleanup or `@Transactional` rollback per test class as appropriate.

**Review checkpoint:** At least one happy-path (CU + AU attach + message) and one security regression (non-participant cannot subscribe or load messages).

---

## How to “control every chunk”

After each phase:

1. Stop and **read the diff** for that phase only.
2. Run **`./gradlew test`** (unit + slice); run **E2E** suite separately if tagged (e.g. JUnit `@Tag("e2e")`) when it is slower or needs Docker.
3. Use Swagger for manual REST checks; use a STOMP client for manual WS checks during development.

**Frontend:** Angular app structure, component tests, and Playwright/Cypress (or similar) **E2E** belong in the **separate Angular plan** — not this document.

---

## Risk list

| Risk | Mitigation |
|------|------------|
| Empty authorities break `@PreAuthorize` | Phase 0 |
| WS bypasses HTTP filters | Dedicated handshake + STOMP interceptors (Phase 4–5) |
| Agent reads messages before attach | Explicit rule in Phase 2 + Phase 7–8 tests |
