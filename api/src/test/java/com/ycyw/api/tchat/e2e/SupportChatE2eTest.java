package com.ycyw.api.tchat.e2e;

import com.ycyw.api.auth.payload.LoginRequest;
import com.ycyw.api.auth.payload.LoginResponse;
import com.ycyw.api.tchat.dto.ActiveChatResponse;
import com.ycyw.api.tchat.dto.ChatListResponse;
import com.ycyw.api.tchat.dto.ChatMessagesResponse;
import com.ycyw.api.tchat.dto.stomp.ChatIdStompPayload;
import com.ycyw.api.tchat.dto.stomp.ChatSendStompPayload;
import com.ycyw.api.tchat.dto.CreateActiveChatRequest;
import com.ycyw.api.tchat.model.AgentChatBucket;
import com.ycyw.api.tchat.repository.ChatMessageRepository;
import com.ycyw.api.tchat.repository.ChatRepository;
import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import com.ycyw.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.springframework.web.socket.sockjs.client.SockJsClient;
import org.springframework.web.socket.sockjs.client.Transport;
import org.springframework.web.socket.sockjs.client.WebSocketTransport;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Backend E2E on H2 ({@code application-test.yml}): repository-seeded users, HTTP + STOMP/SockJS (no
 * Testcontainers).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Tag("e2e")
class SupportChatE2eTest {

    private static final String PASSWORD = "Test123!";

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatRepository chatRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private RestClient http;

    @BeforeEach
    void resetDbAndSeedUsers() {
        chatMessageRepository.deleteAll();
        chatRepository.deleteAll();
        userRepository.deleteAll();

        userRepository.save(user("e2e-client", "e2e-client@test.local", Role.CLIENT));
        userRepository.save(user("e2e-agent", "e2e-agent@test.local", Role.AGENT));
        userRepository.save(user("e2e-stranger", "e2e-stranger@test.local", Role.CLIENT));

        http = RestClient.builder().baseUrl("http://127.0.0.1:" + port).build();
    }

    @Test
    void happyPath_restAndStomp_clientCreatesChat_agentAttaches_messagesFlow() throws Exception {
        String clientJwt = login("e2e-client", PASSWORD);
        String agentJwt = login("e2e-agent", PASSWORD);

        ActiveChatResponse created =
                http.post()
                        .uri("/api/chat/active")
                        .contentType(MediaType.APPLICATION_JSON)
                        .headers(h -> h.setBearerAuth(clientJwt))
                        .body(new CreateActiveChatRequest("Hello support"))
                        .retrieve()
                        .body(ActiveChatResponse.class);
        assertThat(created).isNotNull();
        UUID chatId = created.chatId();

        ChatListResponse newRequests =
                http.get()
                        .uri(uriBuilder ->
                                uriBuilder
                                        .path("/api/agent/chats")
                                        .queryParam("bucket", AgentChatBucket.NEW_REQUESTS.name())
                                        .build())
                        .headers(h -> h.setBearerAuth(agentJwt))
                        .retrieve()
                        .body(ChatListResponse.class);
        assertThat(newRequests.items())
                .anyMatch(
                        s -> s.chatId().equals(chatId) && "e2e-client".equals(s.clientUsername()));

        assertThatThrownBy(
                        () ->
                                http.get()
                                        .uri("/api/chat/{chatId}/messages", chatId)
                                        .headers(h -> h.setBearerAuth(agentJwt))
                                        .retrieve()
                                        .toBodilessEntity())
                .isInstanceOf(RestClientResponseException.class)
                .extracting(ex -> ((RestClientResponseException) ex).getStatusCode().value())
                .isEqualTo(403);

        StompSession agentSession = connectStomp(agentJwt);
        StompSession clientSession = connectStomp(clientJwt);

        BlockingQueue<String> agentErrors = new LinkedBlockingQueue<>();
        agentSession.subscribe(
                "/user/queue/errors",
                new StompFrameHandler() {
                    @Override
                    public Type getPayloadType(StompHeaders headers) {
                        return byte[].class;
                    }

                    @Override
                    public void handleFrame(StompHeaders headers, Object payload) {
                        agentErrors.offer(new String((byte[]) payload, StandardCharsets.UTF_8));
                    }
                });

        BlockingQueue<String> topicEvents = new LinkedBlockingQueue<>();
        clientSession.subscribe(
                "/topic/chat/" + chatId,
                new StompFrameHandler() {
                    @Override
                    public Type getPayloadType(StompHeaders headers) {
                        return byte[].class;
                    }

                    @Override
                    public void handleFrame(StompHeaders headers, Object payload) {
                        topicEvents.offer(new String((byte[]) payload, StandardCharsets.UTF_8));
                    }
                });

        agentSession.send("/app/chat.attach", new ChatIdStompPayload(chatId));
        Thread.sleep(800);

        ChatMessagesResponse afterAttach =
                http.get()
                        .uri("/api/chat/{chatId}/messages", chatId)
                        .headers(h -> h.setBearerAuth(agentJwt))
                        .retrieve()
                        .body(ChatMessagesResponse.class);
        assertThat(afterAttach.messages()).isNotEmpty();

        UUID clientMsgId = UUID.randomUUID();
        clientSession.send("/app/chat.send", new ChatSendStompPayload(chatId, clientMsgId, "Second line"));
        Thread.sleep(800);

        // Attach also publishes CHAT_STATUS / USER_JOINED on this topic; skip those until MESSAGE_CREATED.
        String createdEvent = null;
        long deadline = System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(10);
        while (createdEvent == null && System.currentTimeMillis() < deadline) {
            String ev = topicEvents.poll(500, TimeUnit.MILLISECONDS);
            if (ev != null && ev.contains("MESSAGE_CREATED")) {
                createdEvent = ev;
            }
        }
        assertThat(createdEvent).isNotNull();
        assertThat(createdEvent).contains(clientMsgId.toString());

        assertThat(agentErrors.poll(500, TimeUnit.MILLISECONDS)).isNull();
        agentSession.disconnect();
        clientSession.disconnect();
    }

    @Test
    void security_nonParticipantCannotLoadMessages() {
        String clientJwt = login("e2e-client", PASSWORD);
        String strangerJwt = login("e2e-stranger", PASSWORD);

        UUID chatId =
                http.post()
                        .uri("/api/chat/active")
                        .contentType(MediaType.APPLICATION_JSON)
                        .headers(h -> h.setBearerAuth(clientJwt))
                        .body(new CreateActiveChatRequest("Private"))
                        .retrieve()
                        .body(ActiveChatResponse.class)
                        .chatId();

        assertThatThrownBy(
                        () ->
                                http.get()
                                        .uri("/api/chat/{chatId}/messages", chatId)
                                        .headers(h -> h.setBearerAuth(strangerJwt))
                                        .retrieve()
                                        .toBodilessEntity())
                .isInstanceOf(RestClientResponseException.class)
                .extracting(ex -> ((RestClientResponseException) ex).getStatusCode().value())
                .isEqualTo(403);
    }

    private User user(String username, String email, Role role) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(PASSWORD));
        u.setRole(role);
        return u;
    }

    private String login(String login, String password) {
        LoginResponse response =
                http.post()
                        .uri("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(new LoginRequest(login, password))
                        .retrieve()
                        .body(LoginResponse.class);
        assertThat(response).isNotNull();
        return response.token();
    }

    private StompSession connectStomp(String jwt) throws Exception {
        List<Transport> transports = List.of(new WebSocketTransport(new StandardWebSocketClient()));
        SockJsClient sockJsClient = new SockJsClient(transports);
        WebSocketStompClient stompClient = new WebSocketStompClient(sockJsClient);
        MappingJackson2MessageConverter messageConverter = new MappingJackson2MessageConverter();
        messageConverter.setObjectMapper(new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules());
        stompClient.setMessageConverter(messageConverter);

        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.AUTHORIZATION, "Bearer " + jwt);

        return stompClient
                .connectAsync("http://127.0.0.1:" + port + "/ws", handshake, new StompSessionHandlerAdapter() {})
                .get(15, TimeUnit.SECONDS);
    }
}
