package com.ycyw.api.user.model;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import static org.assertj.core.api.Assertions.assertThat;

class UserTest {

    @Test
    void getAuthorities_returnsRoleClient_whenRoleIsClient() {
        var user = new User();
        user.setRole(Role.CLIENT);
        assertThat(user.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_CLIENT");
    }

    @Test
    void getAuthorities_returnsRoleAgent_whenRoleIsAgent() {
        var user = new User();
        user.setRole(Role.AGENT);
        assertThat(user.getAuthorities())
                .extracting(GrantedAuthority::getAuthority)
                .containsExactly("ROLE_AGENT");
    }

    @Test
    void getAuthorities_returnsEmpty_whenRoleIsNull() {
        var user = new User();
        assertThat(user.getAuthorities()).isEmpty();
    }
}
