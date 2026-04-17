package com.ycyw.api.tchat.repository;

import com.ycyw.api.tchat.model.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    Optional<ChatMessage> findByIdAndChat_Id(UUID messageId, UUID chatId);

    /** Latest-first page (use service to reverse to ascending for response if needed) */
    Page<ChatMessage> findByChat_IdOrderByCreatedAtDesc(UUID chatId, Pageable pageable);

    /** Forward chronological page */
    Page<ChatMessage> findByChat_IdOrderByCreatedAtAsc(UUID chatId, Pageable pageable);

    /** Messages strictly older than a pivot timestamp (scroll up / load older) */
    Page<ChatMessage> findByChat_IdAndCreatedAtBeforeOrderByCreatedAtDesc(
            UUID chatId, LocalDateTime createdBefore, Pageable pageable);

    /** Messages strictly newer than a pivot timestamp (catch-up after reconnect) */
    Page<ChatMessage> findByChat_IdAndCreatedAtAfterOrderByCreatedAtAsc(
            UUID chatId, LocalDateTime createdAfter, Pageable pageable);

    long countByChat_Id(UUID chatId);
}
