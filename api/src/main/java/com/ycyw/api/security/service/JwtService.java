package com.ycyw.api.security.service;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
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
    private SecretKey getJwtSecretKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }



}
