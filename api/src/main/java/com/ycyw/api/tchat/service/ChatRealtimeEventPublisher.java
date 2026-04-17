package com.ycyw.api.tchat.service;

import com.ycyw.api.tchat.dto.ChatMessageResponse;
import com.ycyw.api.tchat.dto.ws.ChatWsEvents;
import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import com.ycyw.api.user.repository.UserRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Publishes support-chat realtime events after successful DB commits (see {@link #runAfterCommit}).
 */
@Service
public class ChatRealtimeEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public ChatRealtimeEventPublisher(SimpMessagingTemplate messagingTemplate, UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    public void publishMessageCreated(UUID chatId, UUID clientMessageId, ChatMessageResponse message) {
        var payload = ChatWsEvents.MessageCreated.of(chatId, clientMessageId, message);
        runAfterCommit(() -> messagingTemplate.convertAndSend(topicDestination(chatId), payload));
    }

    public void publishMessageUpdated(UUID chatId, UUID messageId, String content, LocalDateTime updatedAt) {
        var payload = ChatWsEvents.MessageUpdated.of(chatId, messageId, content, updatedAt);
        runAfterCommit(() -> messagingTemplate.convertAndSend(topicDestination(chatId), payload));
    }

    public void publishMessageDeleted(UUID chatId, UUID messageId, LocalDateTime updatedAt) {
        var payload = ChatWsEvents.MessageDeleted.of(chatId, messageId, updatedAt);
        runAfterCommit(() -> messagingTemplate.convertAndSend(topicDestination(chatId), payload));
    }

    public void publishChatStatus(UUID chatId, String statusName) {
        var payload = ChatWsEvents.ChatStatusChanged.of(chatId, statusName);
        runAfterCommit(() -> messagingTemplate.convertAndSend(topicDestination(chatId), payload));
    }

    public void publishUserJoined(UUID chatId, UUID userId, LocalDateTime timestamp) {
        var payload = ChatWsEvents.UserPresence.joined(chatId, userId, timestamp);
        runAfterCommit(() -> messagingTemplate.convertAndSend(topicDestination(chatId), payload));
    }

    public void publishUserLeft(UUID chatId, UUID userId, LocalDateTime timestamp) {
        var payload = ChatWsEvents.UserPresence.left(chatId, userId, timestamp);
        runAfterCommit(() -> messagingTemplate.convertAndSend(topicDestination(chatId), payload));
    }

    public void publishTyping(UUID chatId, UUID userId) {
        var payload = ChatWsEvents.Typing.of(chatId, userId);
        runAfterCommit(() -> messagingTemplate.convertAndSend(topicDestination(chatId), payload));
    }

    /** Notifies every agent (for inbox refresh). Call only when agent-visible buckets change. */
    public void notifyAllAgentsChatListUpdated() {
        var payload = ChatWsEvents.ChatListUpdated.instance();
        runAfterCommit(() -> {
            for (User agent : userRepository.findAllByRole(Role.AGENT)) {
                messagingTemplate.convertAndSendToUser(agent.getUsername(), "/queue/chats", payload);
            }
        });
    }

    private static String topicDestination(UUID chatId) {
        return "/topic/chat/" + chatId;
    }

    private static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}
