# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo containing a Spring Boot REST API (`/api`) and an Angular SPA frontend (`/web`). The application is a chat platform with JWT-based authentication and two user roles: `CLIENT` and `AGENT`.

## Commands

### Backend (`/api`)

```bash
./gradlew bootRun          # Run API on port 8080
./gradlew test             # Run all tests
./gradlew build            # Build JAR
```

### Frontend (`/web`)

```bash
npm install                # Install dependencies
npm start                  # Dev server on port 4200
npm test                   # Run tests with Vitest
npm run build              # Production build
```

### Full Stack with Docker

```bash
# Start everything
docker compose up -d

# Start only PostgreSQL (run API on host)
docker compose up -d postgres
```

Copy `.env.example` to `.env` and adjust values before running Docker. When running the API on the host against a Dockerized DB, set `SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:${POSTGRES_PORT}/ycyw`.

## Architecture

### Authentication Flow

1. `POST /auth/register` or `POST /auth/login` → returns JWT
2. Client includes `Authorization: Bearer <token>` on subsequent requests
3. `JwtAuthenticationFilter` validates tokens; Spring Security enforces role-based access
4. Roles: `CLIENT`, `AGENT` (stored as enum string in DB)

### API Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/user/profile` | JWT |
| PUT | `/user/profile` | JWT |
| — | `/swagger-ui.html` | Public |
| — | `/actuator/health` | Public |

### Backend Structure (`api/src/main/java/com/ycyw/api/`)

- `auth/` — login/registration controllers, JWT service, UserDetailsService
- `user/` — profile management; `User` entity (UUID PK, implements `UserDetails`)
- `security/jwt/` — `JwtAuthenticationFilter`, `JwtService`
- `config/` — `SecurityConfig`, `OpenApiConfig`, `JpaConfig` (auditing)
- `common/` — `GlobalExceptionHandler`, custom exceptions, `ValidPassword` annotation

Database migrations live in `src/main/resources/db/migration/` (Flyway, currently empty — schema is created by Hibernate auto-ddl in dev).

### Frontend Structure (`web/src/app/`)

- `app.routes.ts` — root routing (empty; add lazy-loaded feature routes here)
- `app.config.ts` — Angular app providers
- Signals-based state; standalone components only

## Environment Variables

| Variable | Default | Notes |
|----------|---------|-------|
| `POSTGRES_DB` | `ycyw` | |
| `POSTGRES_USER` | `ycyw_user` | |
| `POSTGRES_PASSWORD` | `changeme` | Change in production |
| `JWT_SECRET` | `changeme_use_a_long_random_string_in_production` | Change in production |
| `JWT_EXPIRATION_MS` | `86400000` | 24 hours |
| `POSTGRES_PORT` | `5432` | Dev overlay exposes Postgres |
| `APP_PORT` | `80` | Host → edge `nginx` container port 80; use `4200` if 80 is taken |
| `FRONTEND_ORIGIN` | `http://localhost:${APP_PORT}` | Set by Compose for WebSocket/CORS origin |

## Angular Coding Standards

These apply to all code in `/web`:

**Components**
- Standalone components only; do NOT set `standalone: true` (default in Angular v20+)
- `changeDetection: ChangeDetectionStrategy.OnPush` on every component
- Use `input()` / `output()` functions, not `@Input()` / `@Output()` decorators
- Do NOT use `@HostBinding` / `@HostListener`; use the `host` object in `@Component` instead
- Do NOT use `ngClass` or `ngStyle`; use `class` and `style` bindings
- Use `NgOptimizedImage` for all static images

**State**
- Signals for local state; `computed()` for derived state
- Use `update()` or `set()` on signals — never `mutate()`

**Templates**
- Native control flow: `@if`, `@for`, `@switch` — not structural directives
- Async pipe for observables

**Services**
- `providedIn: 'root'` for singletons
- `inject()` function for dependency injection, not constructor injection

**TypeScript**
- Strict mode; avoid `any` (use `unknown` when type is uncertain)

**Accessibility**
- Must pass AXE checks and meet WCAG AA minimums (focus management, color contrast, ARIA)
