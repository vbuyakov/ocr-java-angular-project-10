package com.ycyw.api.tchat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP broker for support chat: endpoint {@code /ws}, app prefix {@code /app}, chat topic
 * {@code /topic/chat/{chatId}}, user destinations {@code /user/queue/*} — see
 * {@code context/support_chat_api_endpoints.md}.
 */
@Configuration
@EnableWebSocketMessageBroker
public class ChatWebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final ChatWebSocketJwtHandshakeInterceptor chatWebSocketJwtHandshakeInterceptor;
    private final ChatWebSocketJwtHandshakeHandler chatWebSocketJwtHandshakeHandler;
    private final ChatInboundStompChannelInterceptor chatInboundStompChannelInterceptor;

    @Value("${app.frontend-origin}")
    private String frontendOrigin;

    public ChatWebSocketConfig(
            ChatWebSocketJwtHandshakeInterceptor chatWebSocketJwtHandshakeInterceptor,
            ChatWebSocketJwtHandshakeHandler chatWebSocketJwtHandshakeHandler,
            ChatInboundStompChannelInterceptor chatInboundStompChannelInterceptor
    ) {
        this.chatWebSocketJwtHandshakeInterceptor = chatWebSocketJwtHandshakeInterceptor;
        this.chatWebSocketJwtHandshakeHandler = chatWebSocketJwtHandshakeHandler;
        this.chatInboundStompChannelInterceptor = chatInboundStompChannelInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(frontendOrigin)
                .addInterceptors(chatWebSocketJwtHandshakeInterceptor)
                .setHandshakeHandler(chatWebSocketJwtHandshakeHandler)
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(chatInboundStompChannelInterceptor);
    }
}
