package com.ycyw.api.user.payload;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import com.ycyw.api.common.validation.ValidPassword;

public record ProfileUpdateRequest(
        @NotBlank
        String username,

        @NotBlank
        @Email
        String email,

        @ValidPassword
        String password
) {
}
