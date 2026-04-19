package com.ycyw.api.tchat.web.rest;

import com.ycyw.api.tchat.dto.AgentInboxBucketCountsResponse;
import com.ycyw.api.tchat.dto.ChatListResponse;
import com.ycyw.api.tchat.model.AgentChatBucket;
import com.ycyw.api.tchat.service.ChatService;
import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AgentChatRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ChatService chatService;

    private final UUID agentId = UUID.randomUUID();

    @Test
    void listForAgent_ok() throws Exception {
        when(chatService.listChatsForAgent(eq(agentId), eq(AgentChatBucket.NEW_REQUESTS), any()))
                .thenReturn(new ChatListResponse(List.of(), false, null));

        mockMvc.perform(
                        get("/api/agent/chats")
                                .param("bucket", "NEW_REQUESTS")
                                .with(authentication(agentToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasMore").value(false));
    }

    @Test
    void getInboxBucketCounts_ok() throws Exception {
        when(chatService.getInboxBucketCountsForAgent(agentId)).thenReturn(new AgentInboxBucketCountsResponse(2L, 5L));

        mockMvc.perform(get("/api/agent/chats/bucket-counts").with(authentication(agentToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newRequests").value(2))
                .andExpect(jsonPath("$.myActive").value(5));
    }

    private UsernamePasswordAuthenticationToken agentToken() {
        User u = new User();
        u.setId(agentId);
        u.setUsername("agent1");
        u.setEmail("a@test");
        u.setPassword("p");
        u.setRole(Role.AGENT);
        return new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities());
    }
}
