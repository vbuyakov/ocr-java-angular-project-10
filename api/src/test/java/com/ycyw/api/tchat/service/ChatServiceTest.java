package com.ycyw.api.tchat.service;

import com.ycyw.api.common.exception.ConflictException;
import com.ycyw.api.tchat.dto.ChatMessageResponse;
import com.ycyw.api.tchat.exception.ChatClosedException;
import com.ycyw.api.tchat.model.Chat;
import com.ycyw.api.tchat.model.ChatMessage;
import com.ycyw.api.tchat.model.ChatMessageStatus;
import com.ycyw.api.tchat.model.ChatStatus;
import com.ycyw.api.tchat.repository.ChatMessageRepository;
import com.ycyw.api.tchat.repository.ChatRepository;
import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import com.ycyw.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatRepository chatRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ChatAccessService chatAccessService;

    @Mock
    private ChatRealtimeEventPublisher chatRealtimeEventPublisher;

    @InjectMocks
    private ChatService chatService;

    private final UUID chatId = UUID.randomUUID();
    private final UUID clientId = UUID.randomUUID();
    private final UUID agentId = UUID.randomUUID();
    private final UUID clientMessageId = UUID.randomUUID();

    private Chat openChat;
    private User clientUser;
    private User agentUser;

    @BeforeEach
    void setUp() {
        clientUser = userWith(clientId, Role.CLIENT);
        agentUser = userWith(agentId, Role.AGENT);
        openChat = new Chat();
        openChat.setId(chatId);
        openChat.setClient(clientUser);
        openChat.setAgent(agentUser);
        openChat.setStatus(ChatStatus.ACTIVE);
    }

    @Test
    void sendChatMessage_savesAndPublishesMessageCreated() {
        doNothing().when(chatAccessService).validateParticipant(chatId, clientId);
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(openChat));
        when(userRepository.getReferenceById(clientId)).thenReturn(clientUser);
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenAnswer(inv -> {
                    ChatMessage m = inv.getArgument(0);
                    m.setId(UUID.randomUUID());
                    m.setCreatedAt(LocalDateTime.now());
                    m.setUpdatedAt(LocalDateTime.now());
                    return m;
                });

        chatService.sendChatMessage(chatId, clientId, "hello", clientMessageId);

        verify(chatMessageRepository).save(any(ChatMessage.class));
        verify(chatMessageRepository).flush();
        verify(chatRealtimeEventPublisher)
                .publishMessageCreated(eq(chatId), eq(clientMessageId), any(ChatMessageResponse.class));
    }

    @Test
    void sendChatMessage_throwsWhenChatClosed() {
        openChat.setStatus(ChatStatus.CLOSED);
        doNothing().when(chatAccessService).validateParticipant(chatId, clientId);
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(openChat));

        assertThatThrownBy(() -> chatService.sendChatMessage(chatId, clientId, "hi", null))
                .isInstanceOf(ChatClosedException.class);

        verify(chatMessageRepository, never()).save(any());
        verify(chatRealtimeEventPublisher, never()).publishMessageCreated(any(), any(), any());
    }

    @Test
    void attachAgentToChat_setsActiveAndPublishes() {
        Chat unassigned = new Chat();
        unassigned.setId(chatId);
        unassigned.setClient(clientUser);
        unassigned.setAgent(null);
        unassigned.setStatus(ChatStatus.NEW);

        when(userRepository.findById(agentId)).thenReturn(Optional.of(agentUser));
        when(chatAccessService.loadChat(chatId)).thenReturn(unassigned);

        chatService.attachAgentToChat(chatId, agentId);

        assertThat(unassigned.getStatus()).isEqualTo(ChatStatus.ACTIVE);
        assertThat(unassigned.getAgent()).isEqualTo(agentUser);
        verify(chatRepository).save(unassigned);
        verify(chatRepository).flush();
        verify(chatRealtimeEventPublisher).publishChatStatus(chatId, ChatStatus.ACTIVE.name());
        verify(chatRealtimeEventPublisher).publishUserJoined(eq(chatId), eq(agentId), any(LocalDateTime.class));
        verify(chatRealtimeEventPublisher).notifyAllAgentsChatListUpdated();
    }

    @Test
    void attachAgentToChat_throwsWhenNotAgentRole() {
        User customer = userWith(agentId, Role.CLIENT);
        when(userRepository.findById(agentId)).thenReturn(Optional.of(customer));

        assertThatThrownBy(() -> chatService.attachAgentToChat(chatId, agentId))
                .isInstanceOf(AccessDeniedException.class);

        verify(chatRepository, never()).save(any());
        verify(chatRealtimeEventPublisher, never()).notifyAllAgentsChatListUpdated();
    }

    @Test
    void closeChat_publishesWhenTransitioningToClosed() {
        doNothing().when(chatAccessService).validateParticipant(chatId, clientId);
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(openChat));

        chatService.closeChat(chatId, clientId);

        verify(chatRepository).save(openChat);
        verify(chatRealtimeEventPublisher).publishChatStatus(chatId, ChatStatus.CLOSED.name());
        verify(chatRealtimeEventPublisher).notifyAllAgentsChatListUpdated();
    }

    @Test
    void closeChat_whenAlreadyClosed_doesNotPublish() {
        openChat.setStatus(ChatStatus.CLOSED);
        doNothing().when(chatAccessService).validateParticipant(chatId, clientId);
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(openChat));

        chatService.closeChat(chatId, clientId);

        verify(chatRepository, never()).save(any());
        verify(chatRealtimeEventPublisher, never()).publishChatStatus(any(), any());
        verify(chatRealtimeEventPublisher, never()).notifyAllAgentsChatListUpdated();
    }

    @Test
    void createActiveChatWithInitialMessage_publishesAndNotifiesAgents() {
        when(chatRepository.findFirstByClient_IdAndStatusNotOrderByUpdatedAtDesc(clientId, ChatStatus.CLOSED))
                .thenReturn(Optional.empty());
        when(userRepository.getReferenceById(clientId)).thenReturn(clientUser);
        when(chatRepository.save(any(Chat.class)))
                .thenAnswer(inv -> {
                    Chat c = inv.getArgument(0);
                    c.setId(chatId);
                    return c;
                });
        when(chatMessageRepository.save(any(ChatMessage.class)))
                .thenAnswer(inv -> {
                    ChatMessage m = inv.getArgument(0);
                    m.setId(UUID.randomUUID());
                    m.setCreatedAt(LocalDateTime.now());
                    m.setUpdatedAt(LocalDateTime.now());
                    return m;
                });

        chatService.createActiveChatWithInitialMessage(clientId, "first");

        verify(chatRealtimeEventPublisher).publishMessageCreated(eq(chatId), eq(null), any(ChatMessageResponse.class));
        verify(chatRealtimeEventPublisher).notifyAllAgentsChatListUpdated();
    }

    @Test
    void createActiveChatWithInitialMessage_throwsConflictWhenActiveExists() {
        when(chatRepository.findFirstByClient_IdAndStatusNotOrderByUpdatedAtDesc(clientId, ChatStatus.CLOSED))
                .thenReturn(Optional.of(openChat));

        assertThatThrownBy(() -> chatService.createActiveChatWithInitialMessage(clientId, "x"))
                .isInstanceOf(ConflictException.class);

        verify(chatRealtimeEventPublisher, never()).publishMessageCreated(any(), any(), any());
    }

    @Test
    void recordTypingIndicator_publishesTyping() {
        doNothing().when(chatAccessService).validateParticipant(chatId, clientId);

        chatService.recordTypingIndicator(chatId, clientId);

        verify(chatRealtimeEventPublisher).publishTyping(chatId, clientId);
    }

    @Test
    void deleteChatMessage_publishesMessageDeleted() {
        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID());
        msg.setChat(openChat);
        msg.setSender(clientUser);
        msg.setContent("x");
        msg.setStatus(ChatMessageStatus.ACTIVE);
        msg.setUpdatedAt(LocalDateTime.now());

        doNothing().when(chatAccessService).validateParticipant(chatId, clientId);
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(openChat));
        when(chatMessageRepository.findByIdAndChat_Id(msg.getId(), chatId)).thenReturn(Optional.of(msg));

        chatService.deleteChatMessage(chatId, clientId, msg.getId());

        verify(chatMessageRepository).save(msg);
        verify(chatRealtimeEventPublisher).publishMessageDeleted(eq(chatId), eq(msg.getId()), any(LocalDateTime.class));
    }

    @Test
    void editChatMessage_publishesMessageUpdated() {
        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID());
        msg.setChat(openChat);
        msg.setSender(clientUser);
        msg.setContent("old");
        msg.setStatus(ChatMessageStatus.ACTIVE);
        msg.setUpdatedAt(LocalDateTime.now());

        doNothing().when(chatAccessService).validateParticipant(chatId, clientId);
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(openChat));
        when(chatMessageRepository.findByIdAndChat_Id(msg.getId(), chatId)).thenReturn(Optional.of(msg));
        when(chatMessageRepository.save(msg))
                .thenAnswer(inv -> {
                    ChatMessage m = inv.getArgument(0);
                    m.setUpdatedAt(LocalDateTime.now());
                    return m;
                });

        chatService.editChatMessage(chatId, clientId, msg.getId(), "new text");

        ArgumentCaptor<String> contentCaptor = ArgumentCaptor.forClass(String.class);
        verify(chatRealtimeEventPublisher)
                .publishMessageUpdated(eq(chatId), eq(msg.getId()), contentCaptor.capture(), any(LocalDateTime.class));
        assertThat(contentCaptor.getValue()).isEqualTo("new text");
    }

    private static User userWith(UUID id, Role role) {
        User u = new User();
        u.setId(id);
        u.setUsername("user-" + id.toString().substring(0, 8));
        u.setEmail(id + "@test.local");
        u.setPassword("secret");
        u.setRole(role);
        return u;
    }
}
