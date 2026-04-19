package com.ycyw.api.tchat.dto;

import com.ycyw.api.tchat.model.Chat;
import com.ycyw.api.tchat.model.ChatMessage;

/**
 * Manual entity → DTO mapping.
 *
 * <p>TODO: Revisit later whether to introduce MapStruct (more DTOs / repeated mappings) or keep this
 * class.
 */
public final class ChatMapper {

    // TODO(recheck): MapStruct vs manual mapping once REST/WS DTO surface stabilizes.

    private ChatMapper() {}

    public static ChatSummaryResponse toSummary(Chat chat) {
        return new ChatSummaryResponse(
                chat.getId(),
                chat.getStatus().name(),
                chat.getClient().getId(),
                chat.getClient().getUsername(),
                chat.getAgent() != null ? chat.getAgent().getId() : null,
                chat.getCreatedAt(),
                chat.getUpdatedAt());
    }

    public static ChatMessageResponse toMessage(ChatMessage m) {
        return new ChatMessageResponse(
                m.getId(),
                m.getChat().getId(),
                m.getSender().getId(),
                m.getSender().getUsername(),
                m.getContent(),
                m.getStatus().name(),
                m.getCreatedAt(),
                m.getUpdatedAt(),
                m.isEdited());
    }
}
