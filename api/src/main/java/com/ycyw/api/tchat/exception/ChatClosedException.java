package com.ycyw.api.tchat.exception;

/** Thrown when a chat-scoped mutation is not allowed because the chat is {@code CLOSED}. */
public class ChatClosedException extends RuntimeException {
    public ChatClosedException() {
        super("Chat is closed");
    }
}
