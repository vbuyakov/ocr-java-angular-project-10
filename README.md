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

### Frontend

## Project Structure

## Contributing
