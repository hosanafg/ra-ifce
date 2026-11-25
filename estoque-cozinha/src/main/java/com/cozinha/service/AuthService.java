package com.cozinha.service;

import com.cozinha.config.JwtService;
import com.cozinha.dto.Dtos.*;
import com.cozinha.exception.RegraNegocioException;
import com.cozinha.model.Papel;
import com.cozinha.model.Usuario;
import com.cozinha.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    @Value("${app.registro-publico}") private boolean registroPublico;

    /** Rota aberta: permite criar contas de estoquista e nutricionista (nunca admin). */
    public UsuarioResponse registrarPublico(RegistroRequest r) {
        if (!registroPublico)
            throw new RegraNegocioException("Cadastro público desabilitado. Peça a um administrador.", HttpStatus.FORBIDDEN);
        if (r.papel() == Papel.ADMIN)
            throw new RegraNegocioException("Contas de admin só podem ser criadas por outro admin.", HttpStatus.FORBIDDEN);
        return criar(r);
    }

    /** Usado pelo admin: pode criar qualquer tipo de conta. */
    public UsuarioResponse criar(RegistroRequest r) {
        String login = r.login().trim().toLowerCase();
        if (usuarios.existsByLogin(login)) throw RegraNegocioException.conflito("Esse login já está em uso.");
        Usuario u = new Usuario();
        u.setLogin(login);
        u.setNome(r.nome().trim());
        u.setPapel(r.papel());
        u.setSenhaHash(encoder.encode(r.senha()));
        return Mapeador.usuario(usuarios.save(u));
    }

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest r) {
        Usuario u = usuarios.findByLogin(r.login().trim().toLowerCase())
                .filter(Usuario::isAtivo)
                .filter(x -> encoder.matches(r.senha(), x.getSenhaHash()))
                .orElseThrow(() -> new RegraNegocioException("Login ou senha inválidos.", HttpStatus.UNAUTHORIZED));
        return token(u);
    }

    public TokenResponse token(Usuario u) {
        return new TokenResponse(jwt.gerar(u), "Bearer", jwt.getExpiracaoMinutos(), Mapeador.usuario(u));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse eu(String login) {
        return Mapeador.usuario(usuarios.findByLogin(login).orElseThrow(() -> RegraNegocioException.naoEncontrado("Usuário")));
    }
}
