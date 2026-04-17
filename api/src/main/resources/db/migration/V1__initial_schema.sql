-- Baseline schema aligned with JPA entities (users, chats, chat_messages).
-- Chat indexes support client/archived queries, agent bucket listings, and message pagination.

CREATE TABLE users (
    id UUID NOT NULL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

CREATE TABLE chats (
    id UUID NOT NULL PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES users (id),
    agent_id UUID REFERENCES users (id),
    status VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_chats_client_status ON chats (client_id, status);
CREATE INDEX idx_chats_status_agent ON chats (status, agent_id);
CREATE INDEX idx_chats_updated_at ON chats (updated_at DESC);

CREATE TABLE chat_messages (
    id UUID NOT NULL PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats (id),
    sender_id UUID NOT NULL REFERENCES users (id),
    content VARCHAR(1000) NOT NULL,
    status VARCHAR(10) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    edited BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_chat_messages_chat_created ON chat_messages (chat_id, created_at);
