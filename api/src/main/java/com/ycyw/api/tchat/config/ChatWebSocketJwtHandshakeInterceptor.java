package com.ycyw.api.tchat.config;

import com.ycyw.api.security.service.JwtService;
import com.ycyw.api.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.UUID;

/**
 * Authenticates the WebSocket handshake using the same JWT as REST: {@code Authorization: Bearer …}.
 * <p>Browser {@code sockjs-client} cannot attach HTTP headers to the SockJS handshake, so the token may
 * also be passed as the {@code access_token} query parameter (same-origin dev and TLS in production).
 */
@Component
public class ChatWebSocketJwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public ChatWebSocketJwtHandshakeInterceptor(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        String jwt = extractAuthToken(request);
        if (jwt == null || !jwtService.isTokenValid(jwt)) {
            return false;
        }
        try {
            UUID userId = jwtService.extractUserId(jwt);
            return userRepository.findById(userId).map(user -> {
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                if (request instanceof ServletServerHttpRequest servletRequest) {
                    HttpServletRequest nativeRequest = servletRequest.getServletRequest();
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(nativeRequest));
                }
                attributes.put(ChatWebSocketJwtHandshakeHandler.USER_AUTHENTICATION_ATTRIBUTE, authentication);
                return true;
            }).orElse(false);
        } catch (RuntimeException e) {
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception
    ) {
        // no-op
    }

    private static String extractAuthToken(ServerHttpRequest request) {
        String auth = request.getHeaders().getFirst("Authorization");
        if (auth != null && auth.startsWith("Bearer ")) {
            return auth.substring(7).trim();
        }
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String fromQuery = servletRequest.getServletRequest().getParameter("access_token");
            if (fromQuery != null && !fromQuery.isBlank()) {
                return fromQuery.trim();
            }
        }
        return null;
    }
}
