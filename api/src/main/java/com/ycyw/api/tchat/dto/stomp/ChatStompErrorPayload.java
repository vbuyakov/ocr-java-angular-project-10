package com.ycyw.api.tchat.dto.stomp;

import java.util.UUID;

/** Server → client error envelope on {@code /user/queue/errors} per support chat spec. */
public record ChatStompErrorPayload(
        String type,
        String code,
        String message,
        UUID clientMessageId
) {
    public static final String TYPE_ERROR = "ERROR";

    public static ChatStompErrorPayload of(String code, String message, UUID clientMessageId) {
        return new ChatStompErrorPayload(TYPE_ERROR, code, message, clientMessageId);
    }
}
