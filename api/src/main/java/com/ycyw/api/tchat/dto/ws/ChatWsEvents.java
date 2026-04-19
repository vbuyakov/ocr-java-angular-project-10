package com.ycyw.api.tchat.dto.ws;

import com.ycyw.api.tchat.dto.ChatMessageResponse;

import java.time.LocalDateTime;
import java.util.UUID;

/** Server → client STOMP payloads for {@code /topic/chat/{chatId}} and {@code /user/queue/chats}. */
public final class ChatWsEvents {

    private ChatWsEvents() {}

    public record MessageCreated(
            String type, UUID chatId, UUID clientMessageId, ChatMessageResponse message) {
        public static MessageCreated of(UUID chatId, UUID clientMessageId, ChatMessageResponse message) {
            return new MessageCreated("MESSAGE_CREATED", chatId, clientMessageId, message);
        }
    }

    public record MessageUpdated(String type, UUID chatId, UUID messageId, String content, LocalDateTime updatedAt) {
        public static MessageUpdated of(UUID chatId, UUID messageId, String content, LocalDateTime updatedAt) {
            return new MessageUpdated("MESSAGE_UPDATED", chatId, messageId, content, updatedAt);
        }
    }

    public record MessageDeleted(String type, UUID chatId, UUID messageId, LocalDateTime updatedAt) {
        public static MessageDeleted of(UUID chatId, UUID messageId, LocalDateTime updatedAt) {
            return new MessageDeleted("MESSAGE_DELETED", chatId, messageId, updatedAt);
        }
    }

    public record ChatStatusChanged(String type, UUID chatId, String status) {
        public static ChatStatusChanged of(UUID chatId, String status) {
            return new ChatStatusChanged("CHAT_STATUS", chatId, status);
        }
    }

    public record UserPresence(String type, UUID chatId, UUID userId, LocalDateTime timestamp) {
        public static UserPresence joined(UUID chatId, UUID userId, LocalDateTime timestamp) {
            return new UserPresence("USER_JOINED", chatId, userId, timestamp);
        }

        public static UserPresence left(UUID chatId, UUID userId, LocalDateTime timestamp) {
            return new UserPresence("USER_LEFT", chatId, userId, timestamp);
        }
    }

    public record Typing(String type, UUID chatId, UUID userId, String username) {
        public static Typing of(UUID chatId, UUID userId, String username) {
            return new Typing("TYPING", chatId, userId, username);
        }
    }

    /** Published when a user stops typing implicitly (e.g. after sending a message). */
    public record TypingStopped(String type, UUID chatId, UUID userId) {
        public static TypingStopped of(UUID chatId, UUID userId) {
            return new TypingStopped("TYPING_STOPPED", chatId, userId);
        }
    }

    public record ChatListUpdated(String type) {
        public static ChatListUpdated instance() {
            return new ChatListUpdated("CHAT_LIST_UPDATED");
        }
    }
}
