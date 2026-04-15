package com.ycyw.api.user.payload;

import com.ycyw.api.user.model.User;

import java.util.UUID;

public record ProfileResponse (
        UUID id,
        String username,
        String email

) {
    public static ProfileResponse from(User user) {
        return new ProfileResponse(user.getId(), user.getUsername(), user.getEmail());
    }
}
