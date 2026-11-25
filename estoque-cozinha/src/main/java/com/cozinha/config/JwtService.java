package com.cozinha.config;

import com.cozinha.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey chave;
    private final long expiracaoMinutos;

    public JwtService(@Value("${app.jwt.secret}") String segredo,
                      @Value("${app.jwt.expiracao-minutos}") long expiracaoMinutos) {
        this.chave = Keys.hmacShaKeyFor(segredo.getBytes(StandardCharsets.UTF_8));
        this.expiracaoMinutos = expiracaoMinutos;
    }

    public long getExpiracaoMinutos() { return expiracaoMinutos; }

    public String gerar(Usuario u) {
        Date agora = new Date();
        return Jwts.builder()
                .subject(u.getLogin())
                .claim("papel", u.getPapel().name())
                .issuedAt(agora)
                .expiration(new Date(agora.getTime() + expiracaoMinutos * 60_000))
                .signWith(chave)
                .compact();
    }

    public Claims validar(String token) {
        return Jwts.parser().verifyWith(chave).build().parseSignedClaims(token).getPayload();
    }
}
