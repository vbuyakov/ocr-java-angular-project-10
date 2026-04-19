# Your Car Your Way – Customer Support Chat PoC

## Overview

## Prerequisites

## Getting Started

### Environment Setup

### Running with Docker Compose

In development, `docker-compose.dev.yml` publishes PostgreSQL on
`localhost:${POSTGRES_PORT}`. Start only the database with:

`docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres`

If you run the Spring Boot app outside Docker and only keep the database in
Docker, use:

`SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:${POSTGRES_PORT}/ycyw`

## Architecture

### Backend (`/api`)

### Frontend (`/web`)

## API Reference

### Authentication

### Chat

### WebSocket / STOMP

## Development

### Backend

#### Running tests locally

From the `api` directory (Java 21; Gradle wrapper):

| What | Command |
|------|---------|
| **All tests** (unit, slice, and E2E) | `./gradlew test` |
| **Unit / slice only** (excludes E2E under `tchat.e2e`) | `./gradlew test --tests '*' --tests '!com.ycyw.api.tchat.e2e.*'` |
| **E2E only** (`SupportChatE2eTest`: HTTP + SockJS/STOMP on a random port, H2 via `application-test`) | `./gradlew test --tests 'com.ycyw.api.tchat.e2e.SupportChatE2eTest'` |

E2E tests use `@ActiveProfiles("test")` and in-memory H2; you do not need Docker Postgres to run them.

### Frontend

## Project Structure

## Contributing
