package com.ycyw.api.common.exception;

import java.util.List;

public class ConflictException extends RuntimeException{
    private final List<String> messageKeys;

    public ConflictException(List<String> messageKeys) {
        this.messageKeys = messageKeys;
    }

    public List<String> getMessageKeys() {
        return messageKeys;
    }
}
