package com.ycyw.api.tchat.repository;

import com.ycyw.api.tchat.model.Chat;
import com.ycyw.api.tchat.model.ChatStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ChatRepository extends JpaRepository<Chat, UUID> {

    /**
     * Non-closed chat for a client (excludes {@link ChatStatus#CLOSED}). Prefer a single row per policy;
     * returns the most recently updated if multiple exist.
     */
    Optional<Chat> findFirstByClient_IdAndStatusNotOrderByUpdatedAtDesc(UUID clientId, ChatStatus excludedStatus);

    /** CU archived list: closed chats for this client, newest activity first */
    @EntityGraph(attributePaths = {"client", "agent"})
    Page<Chat> findByClient_IdAndStatusOrderByUpdatedAtDesc(UUID clientId, ChatStatus status, Pageable pageable);

    /** AU bucket: unassigned new chats */
    @EntityGraph(attributePaths = {"client", "agent"})
    Page<Chat> findByStatusAndAgentIsNullOrderByUpdatedAtDesc(ChatStatus status, Pageable pageable);

    /** AU bucket: active chats assigned to the current agent */
    @EntityGraph(attributePaths = {"client", "agent"})
    Page<Chat> findByStatusAndAgent_IdOrderByUpdatedAtDesc(ChatStatus status, UUID agentId, Pageable pageable);

    /**
     * AU bucket {@code OTHERS_ACTIVE}: chats in {@link ChatStatus#ACTIVE} handled by another agent
     * (non-null agent and not the current user).
     */
    @EntityGraph(attributePaths = {"client", "agent"})
    @Query(
            """
            SELECT c FROM Chat c
            WHERE c.status = com.ycyw.api.tchat.model.ChatStatus.ACTIVE
            AND c.agent IS NOT NULL
            AND c.agent.id <> :agentId
            ORDER BY c.updatedAt DESC
            """)
    Page<Chat> findActiveChatsAssignedToOthers(@Param("agentId") UUID agentId, Pageable pageable);

    /** AU bucket: all closed chats (system-wide archive view) */
    @EntityGraph(attributePaths = {"client", "agent"})
    Page<Chat> findByStatusOrderByUpdatedAtDesc(ChatStatus status, Pageable pageable);

    /** Agent chat header / summary: load client and agent for {@link com.ycyw.api.tchat.dto.ChatMapper#toSummary}. */
    @EntityGraph(attributePaths = {"client", "agent"})
    Optional<Chat> findWithParticipantsById(UUID id);

    long countByStatusAndAgentIsNull(ChatStatus status);

    long countByStatusAndAgent_Id(ChatStatus status, UUID agentId);
}
