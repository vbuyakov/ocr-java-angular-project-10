package com.ycyw.api.tchat.repository;

import com.ycyw.api.tchat.model.Chat;
import com.ycyw.api.tchat.model.ChatStatus;
import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import com.ycyw.api.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChatRepositoryTest {

    @Autowired
    private ChatRepository chatRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void findFirstByClient_IdAndStatusNot_returnsNonClosedChat() {
        User client = persistUser("cu1", "cu1@t.com", Role.CLIENT);
        Chat open = new Chat();
        open.setClient(client);
        open.setStatus(ChatStatus.NEW);
        chatRepository.save(open);

        assertThat(chatRepository.findFirstByClient_IdAndStatusNotOrderByUpdatedAtDesc(client.getId(), ChatStatus.CLOSED))
                .isPresent()
                .get()
                .extracting(Chat::getStatus)
                .isEqualTo(ChatStatus.NEW);
    }

    @Test
    void findByStatusAndAgentIsNull_returnsNewUnassignedQueue() {
        User client = persistUser("cu2", "cu2@t.com", Role.CLIENT);
        Chat chat = new Chat();
        chat.setClient(client);
        chat.setStatus(ChatStatus.NEW);
        chatRepository.save(chat);

        var page = chatRepository.findByStatusAndAgentIsNullOrderByUpdatedAtDesc(ChatStatus.NEW, PageRequest.of(0, 10));
        assertThat(page.getContent()).hasSize(1);
    }

    @Test
    void findByStatusAndAgent_Id_returnsMyActive() {
        User client = persistUser("cu3", "cu3@t.com", Role.CLIENT);
        User agent = persistUser("ag1", "ag1@t.com", Role.AGENT);
        Chat chat = new Chat();
        chat.setClient(client);
        chat.setAgent(agent);
        chat.setStatus(ChatStatus.ACTIVE);
        chatRepository.save(chat);

        var page = chatRepository.findByStatusAndAgent_IdOrderByUpdatedAtDesc(ChatStatus.ACTIVE, agent.getId(), PageRequest.of(0, 10));
        assertThat(page.getContent()).hasSize(1);
    }

    @Test
    void findActiveChatsAssignedToOthers_excludesCurrentAgent() {
        User client = persistUser("cu4", "cu4@t.com", Role.CLIENT);
        User agentA = persistUser("agA", "agA@t.com", Role.AGENT);
        User agentB = persistUser("agB", "agB@t.com", Role.AGENT);
        Chat chat = new Chat();
        chat.setClient(client);
        chat.setAgent(agentB);
        chat.setStatus(ChatStatus.ACTIVE);
        chatRepository.save(chat);

        var page = chatRepository.findActiveChatsAssignedToOthers(agentA.getId(), PageRequest.of(0, 10));
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().getAgent().getId()).isEqualTo(agentB.getId());
    }

    @Test
    void findByStatusOrderByUpdatedAtDesc_archived() {
        User client = persistUser("cu5", "cu5@t.com", Role.CLIENT);
        Chat chat = new Chat();
        chat.setClient(client);
        chat.setStatus(ChatStatus.CLOSED);
        chatRepository.save(chat);

        var page = chatRepository.findByStatusOrderByUpdatedAtDesc(ChatStatus.CLOSED, PageRequest.of(0, 10));
        assertThat(page.getContent()).hasSize(1);
    }

    private User persistUser(String username, String email, Role role) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPassword("password");
        u.setRole(role);
        return userRepository.save(u);
    }
}
