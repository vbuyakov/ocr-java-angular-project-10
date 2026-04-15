package com.ycyw.api.auth.service;

import com.ycyw.api.auth.payload.LoginRequest;
import com.ycyw.api.auth.payload.RegistrationRequest;
import com.ycyw.api.common.exception.ConflictException;
import com.ycyw.api.security.service.JwtService;
import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import com.ycyw.api.user.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authentificationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuthenticationManager authentificationManager, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authentificationManager = authentificationManager;
        this.jwtService = jwtService;
    }

    public void registerUser(RegistrationRequest registrationRequest){
        String username = registrationRequest.username().trim();
        String email = registrationRequest.email().trim();

        List<String> errors = new ArrayList<>();

        if(this.userRepository.existsByUsernameIgnoreCase(username)){
            errors.add("auth.registration.username.alreadyTaken");
        }
        if(this.userRepository.existsByEmailIgnoreCase(email)){
            errors.add("auth.registration.email.alreadyTaken");
        }

        if(errors.size() > 0){
            throw new ConflictException(errors);
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(registrationRequest.password().trim()));
        user.setRole(Role.CLIENT);
        this.userRepository.save(user);
    }

    public String loginUser(LoginRequest loginRequest){
        Authentication authentication = authentificationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.login().trim(),
                        loginRequest.password().trim()
                )
        );
        User user =  (User) authentication.getPrincipal();
        return this.jwtService.generateToken(user.getId());
    }
}
