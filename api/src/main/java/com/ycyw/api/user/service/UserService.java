package com.ycyw.api.user.service;

import com.ycyw.api.auth.exception.UserNotFoundException;
import com.ycyw.api.user.model.User;
import com.ycyw.api.user.payload.ProfileResponse;
import com.ycyw.api.user.payload.ProfileUpdateRequest;
import com.ycyw.api.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getUserProfile(UUID userId){
        User user = userRepository.findById(userId)
                .orElseThrow(UserNotFoundException::new);
        return ProfileResponse.from(user);
    }
}
