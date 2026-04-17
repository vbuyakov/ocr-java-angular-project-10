package com.ycyw.api.tchat.model;

/**
 * Agent inbox / queue filter for {@code GET /api/agent/chats?bucket=…}.
 */
public enum AgentChatBucket {
    /** {@code status = NEW} and no agent assigned */
    NEW_REQUESTS,
    /** {@code status = ACTIVE} and {@code agent_id} = current agent */
    MY_ACTIVE,
    /** {@code status = ACTIVE} and {@code agent_id} is another non-null agent */
    OTHERS_ACTIVE,
    /** {@code status = CLOSED} */
    ARCHIVED
}
