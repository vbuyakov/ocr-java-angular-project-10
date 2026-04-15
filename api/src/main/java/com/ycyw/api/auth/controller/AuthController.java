package com.ycyw.api.auth.controller;

import jakarta.validation.Valid;
import com.ycyw.api.auth.payload.LoginRequest;
import com.ycyw.api.auth.payload.LoginResponse;
import com.ycyw.api.auth.payload.RegistrationRequest;
import com.ycyw.api.auth.service.AuthService;
import com.ycyw.api.common.payload.MessageResponse;
import com.ycyw.api.common.utils.MessageResolver;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;
    private final MessageResolver messageResolver;

    public AuthController(AuthService authService, MessageResolver messageResolver) {
        this.authService = authService;
        this.messageResolver = messageResolver;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest){
        String token = this.authService.loginUser(loginRequest);
        return ResponseEntity.ok(new LoginResponse(token));
    }

    @PostMapping("/register")
    public ResponseEntity<MessageResponse> register(@Valid @RequestBody RegistrationRequest registrationRequest){
        this.authService.registerUser(registrationRequest);
        String message = messageResolver.get("auth.registration.success");
        return ResponseEntity.status(HttpStatus.CREATED).body(new MessageResponse(message));
    }

}
