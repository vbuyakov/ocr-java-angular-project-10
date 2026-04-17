package com.ycyw.api.tchat.config;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

/**
 * Propagates the {@link org.springframework.security.core.Authentication} set during the WebSocket
 * handshake (see {@link ChatWebSocketJwtHandshakeInterceptor}) as the STOMP session principal.
 */
@Component
public class ChatWebSocketJwtHandshakeHandler extends DefaultHandshakeHandler {

    public static final String USER_AUTHENTICATION_ATTRIBUTE = "chat.ws.userAuthentication";

    @Override
    protected Principal determineUser(
            org.springframework.http.server.ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        Object auth = attributes.get(USER_AUTHENTICATION_ATTRIBUTE);
        if (auth instanceof Principal principal) {
            return principal;
        }
        return null;
    }
}
