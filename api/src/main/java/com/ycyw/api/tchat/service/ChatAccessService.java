package com.ycyw.api.tchat.service;

import com.ycyw.api.common.exception.ResourceNotFoundException;
import com.ycyw.api.tchat.model.Chat;
import com.ycyw.api.tchat.repository.ChatRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Central authorization for chat-scoped operations (REST and WebSocket).
 *
 * <p><strong>Participant rule:</strong> only the chat’s client (CU) or the <em>assigned</em> agent
 * (AU with {@code agent_id} set to that user) may access chat content (messages, topic subscription).
 * While {@code agent_id} is {@code null}, only the client is a participant; agents are not allowed to
 * load messages or subscribe to the chat topic until they attach (become the assigned agent).
 *
 * <p><strong>Unassigned chats ({@code agent_id} null):</strong> an agent may still open the chat for
 * attach / queue flows — that is enforced with {@code ROLE_AGENT}, chat status, and
 * {@code ChatService}, not with {@link #validateAgent(UUID, UUID)} (which requires an assigned agent).
 *
 * <p><strong>TODO — recheck after REST/WS integration:</strong>
 * <ul>
 *   <li>Whether {@link #validateParticipant(UUID, UUID)} stays or call sites use only {@link #isParticipant(UUID, UUID)} + throw.</li>
 *   <li>Whether {@link #validateClient(UUID, UUID)} / {@link #validateAgent(UUID, UUID)} are still needed per endpoint or can be simplified.</li>
 *   <li>Align unassigned-chat / attach / queue rules with {@code ChatService} once implemented; ensure no auth gap.</li>
 * </ul>
 */
@Service
public class ChatAccessService {

    // TODO(recheck post Phase 3–5): REST + STOMP coverage; drop or keep validate* helpers vs isParticipant-only at call sites.

    private final ChatRepository chatRepository;

    public ChatAccessService(ChatRepository chatRepository) {
        this.chatRepository = chatRepository;
    }

    /** Loads the chat or throws {@link ResourceNotFoundException} if it does not exist. */
    public Chat loadChat(UUID chatId) {
        return chatRepository.findById(chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat not found"));
    }

    /**
     * Validates that the user may access this chat as a <em>participant</em> (the customer or the
     * assigned agent). The assigned agent <strong>passes</strong> here but <strong>fails</strong>
     * {@link #validateClient(UUID, UUID)}; the customer <strong>fails</strong> {@link #validateAgent(UUID, UUID)}.
     */
    public void validateParticipant(UUID chatId, UUID userId) {
        Chat chat = loadChat(chatId);
        if (!isParticipant(chat, userId)) {
            throw new AccessDeniedException("Not a chat participant");
        }
    }

    /**
     * Validates that the user is the chat <em>customer</em> ({@code client_id}). Stricter than
     * {@link #validateParticipant(UUID, UUID)}: the assigned agent passes participant validation but
     * fails here. Use only for operations that must not be performed by the agent on behalf of this
     * chat (if your product defines any); otherwise prefer {@link #validateParticipant(UUID, UUID)} or
     * role-only checks at the controller.
     */
    public void validateClient(UUID chatId, UUID userId) {
        Chat chat = loadChat(chatId);
        if (!chat.getClient().getId().equals(userId)) {
            throw new AccessDeniedException("Not the chat client");
        }
    }

    /**
     * Validates that the user is this chat’s <em>assigned</em> agent ({@code agent_id} is non-null and
     * equals {@code userId}). Symmetric to {@link #validateClient(UUID, UUID)} for the agent side.
     * When {@code agent_id} is {@code null}, this always fails — use {@link #validateParticipant(UUID, UUID)}
     * only after attach, or attach/list rules in {@code ChatService} for unassigned chats.
     */
    public void validateAgent(UUID chatId, UUID userId) {
        Chat chat = loadChat(chatId);
        if (chat.getAgent() == null || !chat.getAgent().getId().equals(userId)) {
            throw new AccessDeniedException("Not the assigned agent");
        }
    }

    public boolean isParticipant(UUID chatId, UUID userId) {
        return chatRepository.findById(chatId)
                .map(chat -> isParticipant(chat, userId))
                .orElse(false);
    }

    private static boolean isParticipant(Chat chat, UUID userId) {
        if (userId.equals(chat.getClient().getId())) {
            return true;
        }
        return chat.getAgent() != null && userId.equals(chat.getAgent().getId());
    }
}
