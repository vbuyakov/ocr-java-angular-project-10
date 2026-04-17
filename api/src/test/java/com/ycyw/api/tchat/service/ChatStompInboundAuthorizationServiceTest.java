package com.ycyw.api.tchat.service;

import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.access.AccessDeniedException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class ChatStompInboundAuthorizationServiceTest {

    @Mock
    private ChatAccessService chatAccessService;

    @InjectMocks
    private ChatStompInboundAuthorizationService authorizationService;

    private final UUID chatId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @Test
    void subscribe_chatTopic_allowedWhenParticipant() {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        acc.setDestination("/topic/chat/" + chatId);
        acc.setUser(authFor(userId));

        doNothing().when(chatAccessService).validateParticipant(chatId, userId);

        assertThat(authorizationService.isInboundStompAllowed(acc)).isTrue();
    }

    @Test
    void subscribe_chatTopic_deniedWhenNotParticipant() {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        acc.setDestination("/topic/chat/" + chatId);
        acc.setUser(authFor(userId));

        doThrow(new AccessDeniedException("no")).when(chatAccessService).validateParticipant(chatId, userId);

        assertThat(authorizationService.isInboundStompAllowed(acc)).isFalse();
    }

    @Test
    void subscribe_userQueue_allowedWhenAuthenticated() {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        acc.setDestination("/user/queue/chats");
        acc.setUser(authFor(userId));

        assertThat(authorizationService.isInboundStompAllowed(acc)).isTrue();
    }

    @Test
    void subscribe_unknownTopic_denied() {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        acc.setDestination("/topic/other");
        acc.setUser(authFor(userId));

        assertThat(authorizationService.isInboundStompAllowed(acc)).isFalse();
    }

    @Test
    void connect_deniedWithoutUser() {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.CONNECT);

        assertThat(authorizationService.isInboundStompAllowed(acc)).isFalse();
    }

    @Test
    void connect_allowedWithUser() {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.CONNECT);
        acc.setUser(authFor(userId));

        assertThat(authorizationService.isInboundStompAllowed(acc)).isTrue();
    }

    private static UsernamePasswordAuthenticationToken authFor(UUID id) {
        User u = new User();
        u.setId(id);
        u.setUsername("u");
        u.setEmail("u@test");
        u.setPassword("p");
        u.setRole(Role.CLIENT);
        return new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities());
    }
}
