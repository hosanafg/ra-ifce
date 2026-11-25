package com.cozinha.controller;

import com.cozinha.config.Perfis;
import com.cozinha.dto.Dtos.*;
import com.cozinha.service.AuthService;
import com.cozinha.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/usuarios")
@PreAuthorize(Perfis.ADMIN)
@RequiredArgsConstructor
public class AdminController {
    private final UsuarioService usuarios;
    private final AuthService auth;

    @GetMapping
    public List<UsuarioResponse> listar() { return usuarios.listar(); }

    @GetMapping("/{id}")
    public UsuarioResponse buscar(@PathVariable Long id) { return usuarios.buscar(id); }

    @PostMapping
    public ResponseEntity<UsuarioResponse> criar(@Valid @RequestBody RegistroRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.criar(r));
    }

    @PutMapping("/{id}")
    public UsuarioResponse atualizar(@PathVariable Long id, @Valid @RequestBody AlterarUsuarioRequest r, Authentication a) {
        return usuarios.atualizar(id, r, a.getName());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desativar(@PathVariable Long id, Authentication a) {
        usuarios.desativar(id, a.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/token-suporte")
    public TokenResponse tokenSuporte(@PathVariable Long id, Authentication a) {
        return usuarios.tokenDeSuporte(id, a.getName());
    }
}
