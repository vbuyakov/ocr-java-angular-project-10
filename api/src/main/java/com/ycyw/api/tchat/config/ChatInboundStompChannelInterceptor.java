package com.ycyw.api.tchat.config;

import com.ycyw.api.tchat.service.ChatStompInboundAuthorizationService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

/**
 * Delegates inbound STOMP authorization to {@link ChatStompInboundAuthorizationService}.
 */
@Component
public class ChatInboundStompChannelInterceptor implements ChannelInterceptor {

    private final ChatStompInboundAuthorizationService chatStompInboundAuthorizationService;

    public ChatInboundStompChannelInterceptor(
            ChatStompInboundAuthorizationService chatStompInboundAuthorizationService
    ) {
        this.chatStompInboundAuthorizationService = chatStompInboundAuthorizationService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        return chatStompInboundAuthorizationService.isInboundStompAllowed(accessor) ? message : null;
    }
}
