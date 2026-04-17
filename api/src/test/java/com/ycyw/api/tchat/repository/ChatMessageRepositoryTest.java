package com.ycyw.api.tchat.repository;

import com.ycyw.api.tchat.model.Chat;
import com.ycyw.api.tchat.model.ChatMessage;
import com.ycyw.api.tchat.model.ChatMessageStatus;
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

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChatMessageRepositoryTest {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private ChatRepository chatRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByChat_IdAndCreatedAtBeforeOrderByCreatedAtDesc_loadsOlderMessages() {
        User client = persistUser("cu1", "cu1@t.com", Role.CLIENT);
        Chat chat = new Chat();
        chat.setClient(client);
        chat.setStatus(ChatStatus.ACTIVE);
        chat = chatRepository.save(chat);

        ChatMessage m1 = message(chat, client, "first");
        ChatMessage m2 = message(chat, client, "second");
        chatMessageRepository.save(m1);
        chatMessageRepository.save(m2);

        LocalDateTime pivot = m2.getCreatedAt();
        var page = chatMessageRepository.findByChat_IdAndCreatedAtBeforeOrderByCreatedAtDesc(
                chat.getId(), pivot, PageRequest.of(0, 10));
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().getContent()).isEqualTo("first");
    }

    @Test
    void findByChat_IdOrderByCreatedAtDesc_returnsLatestFirst() {
        User client = persistUser("cu2", "cu2@t.com", Role.CLIENT);
        Chat chat = new Chat();
        chat.setClient(client);
        chat.setStatus(ChatStatus.ACTIVE);
        chat = chatRepository.save(chat);

        chatMessageRepository.save(message(chat, client, "a"));
        chatMessageRepository.save(message(chat, client, "b"));

        var page = chatMessageRepository.findByChat_IdOrderByCreatedAtDesc(chat.getId(), PageRequest.of(0, 10));
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent().getFirst().getContent()).isEqualTo("b");
    }

    private ChatMessage message(Chat chat, User sender, String text) {
        ChatMessage m = new ChatMessage();
        m.setChat(chat);
        m.setSender(sender);
        m.setContent(text);
        m.setStatus(ChatMessageStatus.ACTIVE);
        return m;
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
