package com.ycyw.api.security.service;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {
    @Value("${jwt.expiration-ms}")
    private Long jwtExpiration;

    @Value("${jwt.secret}")
    private String jwtSecret;

    public String generateToken(UUID userId){
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + this.jwtExpiration))
                .signWith(getJwtSecretKey())
                .compact();
    }

    public UUID extractUserId(String token){
        return UUID.fromString(Jwts.parser()
                .verifyWith(getJwtSecretKey())
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject());
    }

    public boolean isTokenValid(String authToken){
        try{
            Jwts.parser()
                    .verifyWith(getJwtSecretKey())
                    .build()
                    .parseSignedClaims(authToken);
            return true;
        } catch(JwtException | IllegalArgumentException e) {
            return false;
        }
    }
    /**
     * Supports either a Base64-encoded key (decoded length ≥ 32 bytes) or a raw UTF-8 string (length ≥ 32 bytes).
     * The default dev value in {@code application.yml} is a plain phrase, not Base64.
     */
    private SecretKey getJwtSecretKey() {
        return Keys.hmacShaKeyFor(resolveHmacKeyBytes(jwtSecret));
    }

    private static byte[] resolveHmacKeyBytes(String secret) {
        try {
            byte[] decoded = Decoders.BASE64.decode(secret);
            if (decoded.length >= 32) {
                return decoded;
            }
        } catch (DecodingException | IllegalArgumentException ignored) {
            // not Base64 (e.g. dev_secret_… with underscores) — use UTF-8 bytes
        }
        byte[] utf8 = secret.getBytes(StandardCharsets.UTF_8);
        if (utf8.length < 32) {
            throw new IllegalStateException(
                    "jwt.secret must be at least 32 UTF-8 bytes, or a Base64 string that decodes to ≥32 bytes");
        }
        return utf8;
    }
}
