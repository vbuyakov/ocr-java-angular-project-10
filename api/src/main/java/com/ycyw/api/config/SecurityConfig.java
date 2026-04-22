package com.ycyw.api.config;

import jakarta.servlet.http.HttpServletResponse;
import com.ycyw.api.auth.service.UserDetailsServiceImpl;
import com.ycyw.api.common.utils.MessageResolver;
import com.ycyw.api.security.jwt.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    private final MessageResolver messageResolver;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, MessageResolver messageResolver) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.messageResolver = messageResolver;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(UserDetailsServiceImpl userDetailsService, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);
        return authProvider;
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED); // 401
            response.setContentType("application/json");
            response.getWriter().write("""
            {
              "error": "unauthorized",
              "code":  "UNAUTHORIZED",
              "message": "%s"
            }
        """.formatted(messageResolver.get("error.forbidden")));
        };
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN); // 403
            response.setContentType("application/json");
            response.getWriter().write("""
            {
              "error": "forbidden",
              "code":  "FORBIDDEN",
              "message": "%s"
            }
        """.formatted(messageResolver.get("error.unauthorized")));
        };
    }

    @Bean
    @Order(1)
    SecurityFilterChain publicChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/auth/**", "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**")
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain apiChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exception ->
                        exception
                                .authenticationEntryPoint(authenticationEntryPoint())
                                .accessDeniedHandler(accessDeniedHandler())
                )
                .authorizeHttpRequests(authorize ->
                        authorize
                                .requestMatchers("/ws/**", "/actuator/**").permitAll()
                                .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        ;
        return http.build();
    }
}
