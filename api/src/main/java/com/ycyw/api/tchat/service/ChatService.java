package com.ycyw.api.tchat.service;

import com.ycyw.api.common.exception.ConflictException;
import com.ycyw.api.common.exception.ResourceNotFoundException;
import com.ycyw.api.common.exception.WrongParametersException;
import com.ycyw.api.tchat.exception.ChatClosedException;
import com.ycyw.api.tchat.dto.ActiveChatResponse;
import com.ycyw.api.tchat.dto.ChatListResponse;
import com.ycyw.api.tchat.dto.ChatMapper;
import com.ycyw.api.tchat.dto.ChatMessagesResponse;
import com.ycyw.api.tchat.dto.ChatSummaryResponse;
import com.ycyw.api.tchat.model.AgentChatBucket;
import com.ycyw.api.tchat.model.Chat;
import com.ycyw.api.tchat.model.ChatMessage;
import com.ycyw.api.tchat.model.ChatMessageStatus;
import com.ycyw.api.tchat.model.ChatStatus;
import com.ycyw.api.tchat.repository.ChatMessageRepository;
import com.ycyw.api.tchat.repository.ChatRepository;
import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ChatService {

    private static final int DEFAULT_MESSAGE_LIMIT = 50;
    private static final int MAX_MESSAGE_LIMIT = 200;

    private static final int MAX_MESSAGE_CONTENT_LENGTH = 1000;

    private final ChatRepository chatRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ChatAccessService chatAccessService;
    private final ChatRealtimeEventPublisher chatRealtimeEventPublisher;

    public ChatService(
            ChatRepository chatRepository,
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            ChatAccessService chatAccessService,
            ChatRealtimeEventPublisher chatRealtimeEventPublisher) {
        this.chatRepository = chatRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.chatAccessService = chatAccessService;
        this.chatRealtimeEventPublisher = chatRealtimeEventPublisher;
    }

    @Transactional(readOnly = true)
    public ActiveChatResponse getActiveChat(UUID clientId) {
        return chatRepository
                .findFirstByClient_IdAndStatusNotOrderByUpdatedAtDesc(clientId, ChatStatus.CLOSED)
                .map(chat -> new ActiveChatResponse(chat.getId(), chat.getStatus().name()))
                .orElseThrow(() -> new ResourceNotFoundException("No active chat"));
    }

    /**
     * Creates a new non-closed chat with the given initial message (required by product rules).
     * Fails if the client already has an active chat.
     */
    @Transactional
    public ActiveChatResponse createActiveChatWithInitialMessage(UUID clientId, String initialMessage) {
        Optional<Chat> existing =
                chatRepository.findFirstByClient_IdAndStatusNotOrderByUpdatedAtDesc(clientId, ChatStatus.CLOSED);
        if (existing.isPresent()) {
            throw new ConflictException(List.of("chat.active.alreadyExists"));
        }
        String content = initialMessage.trim();
        if (content.isEmpty()) {
            throw new WrongParametersException("initialMessage must not be blank");
        }

        Chat chat = new Chat();
        chat.setClient(userRepository.getReferenceById(clientId));
        chat.setStatus(ChatStatus.NEW);
        Chat saved = chatRepository.save(chat);

        ChatMessage first = new ChatMessage();
        first.setChat(saved);
        first.setSender(userRepository.getReferenceById(clientId));
        first.setContent(content);
        first.setStatus(ChatMessageStatus.ACTIVE);
        chatMessageRepository.save(first);
        chatMessageRepository.flush();

        chatRealtimeEventPublisher.publishMessageCreated(
                saved.getId(), null, ChatMapper.toMessage(first));
        chatRealtimeEventPublisher.notifyAllAgentsChatListUpdated();

        return new ActiveChatResponse(saved.getId(), saved.getStatus().name());
    }

    @Transactional(readOnly = true)
    public ChatListResponse listArchivedForClient(UUID clientId, Pageable pageable) {
        Page<Chat> page =
                chatRepository.findByClient_IdAndStatusOrderByUpdatedAtDesc(clientId, ChatStatus.CLOSED, pageable);
        return convertPageToChatListResponse(page);
    }

    @Transactional(readOnly = true)
    public ChatListResponse listChatsForAgent(UUID agentId, AgentChatBucket bucket, Pageable pageable) {
        Page<Chat> page =
                switch (bucket) {
                    case NEW_REQUESTS -> chatRepository.findByStatusAndAgentIsNullOrderByUpdatedAtDesc(
                            ChatStatus.NEW, pageable);
                    case MY_ACTIVE -> chatRepository.findByStatusAndAgent_IdOrderByUpdatedAtDesc(
                            ChatStatus.ACTIVE, agentId, pageable);
                    case OTHERS_ACTIVE -> chatRepository.findActiveChatsAssignedToOthers(agentId, pageable);
                    case ARCHIVED -> chatRepository.findByStatusOrderByUpdatedAtDesc(ChatStatus.CLOSED, pageable);
                };
        return convertPageToChatListResponse(page);
    }

    @Transactional(readOnly = true)
    public ChatMessagesResponse getMessages(
            UUID chatId, UUID userId, int limit, UUID beforeMessageId, UUID afterMessageId) {
        chatAccessService.validateParticipant(chatId, userId);

        int capped = clampLimit(limit);

        if (beforeMessageId != null && afterMessageId != null) {
            throw new WrongParametersException("Use only one of before or after");
        }

        Pageable pageable = PageRequest.of(0, capped + 1);
        if (beforeMessageId != null) {
            ChatMessage cursor = loadMessageFromChat(chatId, beforeMessageId);
            Page<ChatMessage> page = chatMessageRepository.findByChat_IdAndCreatedAtBeforeOrderByCreatedAtDesc(
                    chatId, cursor.getCreatedAt(), pageable);
            return slicePageToResponse(page, capped, true);
        }
        if (afterMessageId != null) {
            ChatMessage cursor = loadMessageFromChat(chatId, afterMessageId);
            Page<ChatMessage> page = chatMessageRepository.findByChat_IdAndCreatedAtAfterOrderByCreatedAtAsc(
                    chatId, cursor.getCreatedAt(), pageable);
            return slicePageToResponse(page, capped, false);
        }
        Page<ChatMessage> page = chatMessageRepository.findByChat_IdOrderByCreatedAtDesc(chatId, pageable);
        return slicePageToResponse(page, capped, true);
    }

    private static ChatListResponse convertPageToChatListResponse(Page<Chat> page) {
        List<ChatSummaryResponse> items = page.getContent().stream().map(ChatMapper::toSummary).toList();
        return new ChatListResponse(items, page.hasNext(), null);
    }

    /**
     * Loads a message by id in this chat, or throws if missing / wrong chat. Used as the time cursor for
     * {@code before} / {@code after} pagination (see query params on GET messages).
     */
    private ChatMessage loadMessageFromChat(UUID chatId, UUID messageId) {
        return chatMessageRepository
                .findByIdAndChat_Id(messageId, chatId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
    }

    /**
     * Trims repository page to {@code limit} rows, computes {@code hasMore}, maps to DTOs.
     * When the DB order is descending (newest first), pass {@code reverseToChronological=true} so the
     * API returns oldest→newest. Ascending pages ({@code after} cursor) need no reverse.
     */
    private static ChatMessagesResponse slicePageToResponse(
            Page<ChatMessage> page, int limit, boolean reverseToChronological) {
        List<ChatMessage> content = new ArrayList<>(page.getContent());
        boolean hasMore = content.size() > limit;
        if (hasMore) {
            content = content.subList(0, limit);
        }
        if (reverseToChronological) {
            Collections.reverse(content);
        }
        return new ChatMessagesResponse(content.stream().map(ChatMapper::toMessage).toList(), hasMore);
    }

    /**
     * Sends a message in an open chat; participant must be the client or the assigned agent (see
     * {@link ChatAccessService#validateParticipant(java.util.UUID, java.util.UUID)}).
     */
    /**
     * @param clientMessageId optional client correlation id (STOMP); {@code null} when not applicable (e.g. internal)
     */
    @Transactional
    public void sendChatMessage(UUID chatId, UUID senderId, String rawContent, UUID clientMessageId) {
        chatAccessService.validateParticipant(chatId, senderId);
        Chat chat = chatRepository.findById(chatId).orElseThrow(() -> new ResourceNotFoundException("Chat not found"));
        assertChatOpenForMutation(chat);

        String text = rawContent.trim();
        if (text.isEmpty()) {
            throw new WrongParametersException("content must not be blank");
        }
        if (text.length() > MAX_MESSAGE_CONTENT_LENGTH) {
            throw new WrongParametersException("content exceeds max length");
        }

        ChatMessage message = new ChatMessage();
        message.setChat(chat);
        message.setSender(userRepository.getReferenceById(senderId));
        message.setContent(text);
        message.setStatus(ChatMessageStatus.ACTIVE);
        chatMessageRepository.save(message);
        chatMessageRepository.flush();

        chatRealtimeEventPublisher.publishMessageCreated(chatId, clientMessageId, ChatMapper.toMessage(message));
    }

    @Transactional
    public void editChatMessage(UUID chatId, UUID userId, UUID messageId, String rawContent) {
        chatAccessService.validateParticipant(chatId, userId);
        Chat chat = chatRepository.findById(chatId).orElseThrow(() -> new ResourceNotFoundException("Chat not found"));
        assertChatOpenForMutation(chat);

        ChatMessage msg = loadMessageFromChat(chatId, messageId);
        assertMessageOwnedAndActive(msg, userId);

        String text = rawContent.trim();
        if (text.isEmpty()) {
            throw new WrongParametersException("content must not be blank");
        }
        if (text.length() > MAX_MESSAGE_CONTENT_LENGTH) {
            throw new WrongParametersException("content exceeds max length");
        }
        msg.setContent(text);
        msg.setEdited(true);
        chatMessageRepository.save(msg);
        chatMessageRepository.flush();

        chatRealtimeEventPublisher.publishMessageUpdated(
                chatId, messageId, msg.getContent(), msg.getUpdatedAt());
    }

    @Transactional
    public void deleteChatMessage(UUID chatId, UUID userId, UUID messageId) {
        chatAccessService.validateParticipant(chatId, userId);
        Chat chat = chatRepository.findById(chatId).orElseThrow(() -> new ResourceNotFoundException("Chat not found"));
        assertChatOpenForMutation(chat);

        ChatMessage msg = loadMessageFromChat(chatId, messageId);
        assertMessageOwnedAndActive(msg, userId);
        msg.setContent("");
        msg.setStatus(ChatMessageStatus.DELETED);
        chatMessageRepository.save(msg);
        chatMessageRepository.flush();

        chatRealtimeEventPublisher.publishMessageDeleted(chatId, messageId, msg.getUpdatedAt());
    }

    /**
     * Assigns the current agent to an unassigned {@link ChatStatus#NEW} chat and moves it to {@link
     * ChatStatus#ACTIVE}.
     */
    @Transactional
    public void attachAgentToChat(UUID chatId, UUID agentUserId) {
        var agent = userRepository.findById(agentUserId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (agent.getRole() != Role.AGENT) {
            throw new AccessDeniedException("Only agents can attach to a chat");
        }
        Chat chat = chatAccessService.loadChat(chatId);
        if (chat.getStatus() != ChatStatus.NEW || chat.getAgent() != null) {
            throw new ConflictException(List.of("chat.attach.unavailable"));
        }
        chat.setAgent(agent);
        chat.setStatus(ChatStatus.ACTIVE);
        chatRepository.save(chat);
        chatRepository.flush();

        LocalDateTime now = LocalDateTime.now();
        chatRealtimeEventPublisher.publishChatStatus(chatId, ChatStatus.ACTIVE.name());
        chatRealtimeEventPublisher.publishUserJoined(chatId, agentUserId, now);
        chatRealtimeEventPublisher.notifyAllAgentsChatListUpdated();
    }

    /** Clears the assigned agent and returns the chat to {@link ChatStatus#NEW} (unassigned queue). */
    @Transactional
    public void detachAgentFromChat(UUID chatId, UUID agentUserId) {
        chatAccessService.validateAgent(chatId, agentUserId);
        Chat chat = chatRepository.findById(chatId).orElseThrow(() -> new ResourceNotFoundException("Chat not found"));
        assertChatOpenForMutation(chat);
        chat.setAgent(null);
        chat.setStatus(ChatStatus.NEW);
        chatRepository.save(chat);
        chatRepository.flush();

        LocalDateTime now = LocalDateTime.now();
        chatRealtimeEventPublisher.publishUserLeft(chatId, agentUserId, now);
        chatRealtimeEventPublisher.publishChatStatus(chatId, ChatStatus.NEW.name());
        chatRealtimeEventPublisher.notifyAllAgentsChatListUpdated();
    }

    @Transactional
    public void closeChat(UUID chatId, UUID userId) {
        chatAccessService.validateParticipant(chatId, userId);
        Chat chat = chatRepository.findById(chatId).orElseThrow(() -> new ResourceNotFoundException("Chat not found"));
        if (chat.getStatus() == ChatStatus.CLOSED) {
            return;
        }
        chat.setStatus(ChatStatus.CLOSED);
        chatRepository.save(chat);
        chatRepository.flush();

        chatRealtimeEventPublisher.publishChatStatus(chatId, ChatStatus.CLOSED.name());
        chatRealtimeEventPublisher.notifyAllAgentsChatListUpdated();
    }

    @Transactional(readOnly = true)
    public void recordTypingIndicator(UUID chatId, UUID userId) {
        chatAccessService.validateParticipant(chatId, userId);
        chatRealtimeEventPublisher.publishTyping(chatId, userId);
    }

    private static void assertChatOpenForMutation(Chat chat) {
        if (chat.getStatus() == ChatStatus.CLOSED) {
            throw new ChatClosedException();
        }
    }

    private static void assertMessageOwnedAndActive(ChatMessage msg, UUID userId) {
        if (!msg.getSender().getId().equals(userId)) {
            throw new AccessDeniedException("Only the message author can change this message");
        }
        if (msg.getStatus() != ChatMessageStatus.ACTIVE) {
            throw new WrongParametersException("Message is not active");
        }
    }

    private static int clampLimit(int limit) {
        if (limit <= 0) {
            return DEFAULT_MESSAGE_LIMIT;
        }
        return Math.min(limit, MAX_MESSAGE_LIMIT);
    }
}
