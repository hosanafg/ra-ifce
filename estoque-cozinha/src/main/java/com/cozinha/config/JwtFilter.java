package com.cozinha.config;

import com.cozinha.model.Usuario;
import com.cozinha.repository.UsuarioRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UsuarioRepository usuarios;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwt.validar(header.substring(7));
                // O papel e o status "ativo" vêm sempre do banco: mudanças feitas pelo admin valem na hora.
                usuarios.findByLogin(claims.getSubject()).filter(Usuario::isAtivo).ifPresent(u -> {
                    var auth = new UsernamePasswordAuthenticationToken(
                            u.getLogin(), null, List.of(new SimpleGrantedAuthority("ROLE_" + u.getPapel().name())));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                });
            } catch (JwtException | IllegalArgumentException e) {
                // token inválido/expirado: segue sem autenticação (resultará em 401 nas rotas protegidas)
            }
        }
        chain.doFilter(req, res);
    }
}
