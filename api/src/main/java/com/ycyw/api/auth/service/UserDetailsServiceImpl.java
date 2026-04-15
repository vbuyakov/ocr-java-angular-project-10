package com.ycyw.api.auth.service;

import com.ycyw.api.auth.exception.UserNotFoundException;
import com.ycyw.api.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String login) throws UserNotFoundException {
        return this.userRepository.findByEmailIgnoreCaseOrUsernameIgnoreCase(login,login)
                .orElseThrow(() -> new UserNotFoundException(login));
    }
}
