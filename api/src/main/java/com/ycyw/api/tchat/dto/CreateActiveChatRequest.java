package com.ycyw.api.tchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateActiveChatRequest(
        @NotBlank @Size(max = 1000) String initialMessage) {}
