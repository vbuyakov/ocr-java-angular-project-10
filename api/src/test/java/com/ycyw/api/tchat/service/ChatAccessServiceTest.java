package com.ycyw.api.tchat.service;

import com.ycyw.api.common.exception.ResourceNotFoundException;
import com.ycyw.api.tchat.model.Chat;
import com.ycyw.api.tchat.model.ChatStatus;
import com.ycyw.api.tchat.repository.ChatRepository;
import com.ycyw.api.user.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatAccessServiceTest {

    @Mock
    private ChatRepository chatRepository;

    @InjectMocks
    private ChatAccessService chatAccessService;

    private final UUID chatId = UUID.randomUUID();
    private final UUID clientId = UUID.randomUUID();
    private final UUID agentId = UUID.randomUUID();
    private final UUID strangerId = UUID.randomUUID();
    private final UUID otherAgentId = UUID.randomUUID();

    @Test
    void validateParticipant_succeeds_forClient() {
        Chat chat = chatWithClientOnly();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        chatAccessService.validateParticipant(chatId, clientId);
    }

    @Test
    void validateParticipant_succeeds_forAssignedAgent() {
        Chat chat = chatWithAgent();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        chatAccessService.validateParticipant(chatId, agentId);
    }

    @Test
    void validateParticipant_throws_whenAgentNotYetAssigned() {
        Chat chat = chatWithClientOnly();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> chatAccessService.validateParticipant(chatId, agentId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("participant");
    }

    @Test
    void validateParticipant_throws_forStranger() {
        Chat chat = chatWithAgent();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> chatAccessService.validateParticipant(chatId, strangerId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void validateParticipant_throws_whenChatMissing() {
        when(chatRepository.findById(chatId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatAccessService.validateParticipant(chatId, clientId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void validateClient_succeeds_forClient() {
        Chat chat = chatWithClientOnly();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        chatAccessService.validateClient(chatId, clientId);
    }

    @Test
    void validateClient_throws_forAgentEvenIfAssigned() {
        Chat chat = chatWithAgent();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> chatAccessService.validateClient(chatId, agentId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("client");
    }

    @Test
    void validateAgent_succeeds_forAssignedAgent() {
        Chat chat = chatWithAgent();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        chatAccessService.validateAgent(chatId, agentId);
    }

    @Test
    void validateAgent_throws_whenNoAgentAssignedYet() {
        Chat chat = chatWithClientOnly();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> chatAccessService.validateAgent(chatId, agentId))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("assigned agent");
    }

    @Test
    void validateAgent_throws_forClient() {
        Chat chat = chatWithAgent();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> chatAccessService.validateAgent(chatId, clientId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void validateAgent_throws_whenAnotherAgentAssigned() {
        Chat chat = chatWithAgent();
        when(chatRepository.findById(chatId)).thenReturn(Optional.of(chat));

        assertThatThrownBy(() -> chatAccessService.validateAgent(chatId, otherAgentId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void isParticipant_returnsFalse_whenChatMissing() {
        when(chatRepository.findById(chatId)).thenReturn(Optional.empty());

        assertThat(chatAccessService.isParticipant(chatId, clientId)).isFalse();
    }

    private Chat chatWithClientOnly() {
        User client = new User();
        client.setId(clientId);
        Chat chat = new Chat();
        chat.setId(chatId);
        chat.setClient(client);
        chat.setStatus(ChatStatus.NEW);
        return chat;
    }

    private Chat chatWithAgent() {
        Chat chat = chatWithClientOnly();
        User agent = new User();
        agent.setId(agentId);
        chat.setAgent(agent);
        chat.setStatus(ChatStatus.ACTIVE);
        return chat;
    }
}
