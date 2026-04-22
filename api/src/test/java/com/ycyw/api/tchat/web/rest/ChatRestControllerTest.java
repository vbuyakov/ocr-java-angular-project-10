package com.ycyw.api.tchat.web.rest;

import com.ycyw.api.tchat.dto.ActiveChatResponse;
import com.ycyw.api.tchat.dto.ChatListResponse;
import com.ycyw.api.tchat.dto.ChatMessagesResponse;
import com.ycyw.api.tchat.service.ChatService;
import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ChatRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChatService chatService;

    private final UUID userId = UUID.randomUUID();
    private final UUID chatId = UUID.randomUUID();

    @Test
    void getActiveChat_ok() throws Exception {
        when(chatService.getActiveChat(userId)).thenReturn(new ActiveChatResponse(chatId, "NEW"));

        mockMvc.perform(
                        get("/api/chat/active")
                                .with(authentication(clientToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chatId").value(chatId.toString()))
                .andExpect(jsonPath("$.status").value("NEW"));
    }

    @Test
    void createActiveChat_ok() throws Exception {
        when(chatService.createActiveChatWithInitialMessage(eq(userId), eq("hello")))
                .thenReturn(new ActiveChatResponse(chatId, "NEW"));

        mockMvc.perform(
                        post("/api/chat/active")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"initialMessage\":\"hello\"}")
                                .with(authentication(clientToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chatId").value(chatId.toString()));
    }

    @Test
    void getMessages_ok() throws Exception {
        when(chatService.getMessages(chatId, userId, 50, null, null))
                .thenReturn(new ChatMessagesResponse(List.of(), false, null, null, "ACTIVE"));

        mockMvc.perform(
                        get("/api/chat/{chatId}/messages", chatId)
                                .param("limit", "50")
                                .with(authentication(agentToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    @Test
    void listArchived_ok() throws Exception {
        when(chatService.listArchivedForClient(eq(userId), any()))
                .thenReturn(new ChatListResponse(List.of(), false, null));

        mockMvc.perform(
                        get("/api/chat/archived")
                                .with(authentication(clientToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    private UsernamePasswordAuthenticationToken clientToken() {
        User u = clientUser();
        return new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities());
    }

    private UsernamePasswordAuthenticationToken agentToken() {
        User u = agentUser();
        return new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities());
    }

    private User clientUser() {
        User u = new User();
        u.setId(userId);
        u.setUsername("cu");
        u.setEmail("cu@test");
        u.setPassword("p");
        u.setRole(Role.CLIENT);
        return u;
    }

    private User agentUser() {
        User u = new User();
        u.setId(userId);
        u.setUsername("au");
        u.setEmail("au@test");
        u.setPassword("p");
        u.setRole(Role.AGENT);
        return u;
    }
}
