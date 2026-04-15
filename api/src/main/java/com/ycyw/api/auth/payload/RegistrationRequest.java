package com.ycyw.api.auth.payload;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import com.ycyw.api.common.validation.ValidPassword;

public record RegistrationRequest (
    @NotBlank
    String username,

    @NotBlank
    @Email
    String email,

    @NotBlank
    @ValidPassword
    String password
) {}
