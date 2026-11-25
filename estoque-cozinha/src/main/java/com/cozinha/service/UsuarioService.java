package com.cozinha.service;

import com.cozinha.dto.Dtos.*;
import com.cozinha.exception.RegraNegocioException;
import com.cozinha.model.Papel;
import com.cozinha.model.Usuario;
import com.cozinha.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/** Operações de administração e suporte sobre contas. */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UsuarioService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final AuthService auth;

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listar() {
        return usuarios.findAll().stream().map(Mapeador::usuario).toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscar(Long id) {
        return Mapeador.usuario(obter(id));
    }

    public UsuarioResponse atualizar(Long id, AlterarUsuarioRequest r, String adminLogin) {
        Usuario u = obter(id);
        boolean eleMesmo = u.getLogin().equals(adminLogin);
        if (eleMesmo && ((r.papel() != null && r.papel() != Papel.ADMIN) || Boolean.FALSE.equals(r.ativo())))
            throw RegraNegocioException.invalido("Você não pode rebaixar ou desativar a própria conta.");
        if (r.nome() != null && !r.nome().isBlank()) u.setNome(r.nome().trim());
        if (r.papel() != null) u.setPapel(r.papel());
        if (r.ativo() != null) u.setAtivo(r.ativo());
        if (r.novaSenha() != null) u.setSenhaHash(encoder.encode(r.novaSenha()));   // redefinição de senha (suporte)
        return Mapeador.usuario(u);
    }

    /** "Excluir" = desativar, para preservar histórico (notas, cardápios). */
    public void desativar(Long id, String adminLogin) {
        Usuario u = obter(id);
        if (u.getLogin().equals(adminLogin)) throw RegraNegocioException.invalido("Você não pode desativar a própria conta.");
        u.setAtivo(false);
    }

    /** Gera um token para o admin acessar o sistema como aquela conta (suporte). Fica registrado em log. */
    public TokenResponse tokenDeSuporte(Long id, String adminLogin) {
        Usuario u = obter(id);
        if (!u.isAtivo()) throw RegraNegocioException.invalido("A conta está desativada.");
        log.warn("SUPORTE: admin '{}' gerou token de acesso para a conta '{}'", adminLogin, u.getLogin());
        return auth.token(u);
    }

    private Usuario obter(Long id) {
        return usuarios.findById(id).orElseThrow(() -> RegraNegocioException.naoEncontrado("Usuário"));
    }
}
