package com.ycyw.api.user.payload;

import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;

import java.util.UUID;

public record ProfileResponse(UUID id, String username, String email, Role role) {
    public static ProfileResponse from(User user) {
        return new ProfileResponse(user.getId(), user.getUsername(), user.getEmail(), user.getRole());
    }
}
