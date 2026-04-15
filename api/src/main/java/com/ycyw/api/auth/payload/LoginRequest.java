package com.ycyw.api.auth.payload;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest (
   @NotBlank
   String login,

   @NotBlank
   String password
) {};
