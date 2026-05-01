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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

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

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void findByChat_IdAndCreatedAtBeforeOrderByCreatedAtDesc_loadsOlderMessages() {
        User client = persistUser("cu1", "cu1@t.com", Role.CLIENT);
        Chat chat = new Chat();
        chat.setClient(client);
        chat.setStatus(ChatStatus.ACTIVE);
        chat = chatRepository.save(chat);

        // Fixed times so "before pivot" and DESC order are deterministic (avoids identical audited timestamps in CI).
        LocalDateTime tFirst = LocalDateTime.of(2020, 1, 1, 12, 0, 0);
        LocalDateTime tSecond = LocalDateTime.of(2020, 1, 1, 12, 0, 1);
        ChatMessage m1 = message(chat, client, "first");
        m1.setCreatedAt(tFirst);
        m1.setUpdatedAt(tFirst);
        ChatMessage m2 = message(chat, client, "second");
        m2.setCreatedAt(tSecond);
        m2.setUpdatedAt(tSecond);
        chatMessageRepository.save(m1);
        chatMessageRepository.save(m2);
        // Auditing overwrites @CreatedDate on insert; pin rows in the DB so pagination is deterministic in CI.
        forceMessageTimestamps(m1.getId(), tFirst);
        forceMessageTimestamps(m2.getId(), tSecond);

        var page = chatMessageRepository.findByChat_IdAndCreatedAtBeforeOrderByCreatedAtDesc(
                chat.getId(), tSecond, PageRequest.of(0, 10));
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

        LocalDateTime tA = LocalDateTime.of(2020, 1, 1, 9, 0, 0);
        LocalDateTime tB = LocalDateTime.of(2020, 1, 1, 9, 0, 1);
        ChatMessage ma = message(chat, client, "a");
        ma.setCreatedAt(tA);
        ma.setUpdatedAt(tA);
        ChatMessage mb = message(chat, client, "b");
        mb.setCreatedAt(tB);
        mb.setUpdatedAt(tB);
        chatMessageRepository.save(ma);
        chatMessageRepository.save(mb);
        forceMessageTimestamps(ma.getId(), tA);
        forceMessageTimestamps(mb.getId(), tB);

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

    private void forceMessageTimestamps(UUID messageId, LocalDateTime createdAt) {
        chatMessageRepository.flush();
        jdbcTemplate.update(
                "UPDATE chat_messages SET created_at = ?, updated_at = ? WHERE id = ?",
                createdAt,
                createdAt,
                messageId);
    }
}
