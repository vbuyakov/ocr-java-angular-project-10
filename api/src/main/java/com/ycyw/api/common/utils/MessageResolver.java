package com.ycyw.api.common.utils;

import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;

@Component
public class MessageResolver {
    private final MessageSource messageSource;

    public MessageResolver(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    public String get(String key, Object... args) {
        return messageSource.getMessage(key, args, null);
    }
    public String get(String key) {
        return messageSource.getMessage(key, null, null);
    }
}
