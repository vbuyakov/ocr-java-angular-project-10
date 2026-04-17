package com.ycyw.api.user.repository;

import com.ycyw.api.user.model.Role;
import com.ycyw.api.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    List<User> findAllByRole(Role role);
    Optional<User> findByEmailIgnoreCaseOrUsernameIgnoreCase(String email, String username);

    Boolean existsByEmailIgnoreCase(String email);
    Boolean existsByUsernameIgnoreCase(String username);

    Boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);
    Boolean existsByUsernameIgnoreCaseAndIdNot(String username, UUID id);
}
