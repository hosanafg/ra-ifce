package com.cozinha.controller;

import com.cozinha.dto.Dtos.*;
import com.cozinha.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;

    @PostMapping("/registrar")
    public ResponseEntity<UsuarioResponse> registrar(@Valid @RequestBody RegistroRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registrarPublico(r));
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest r) {
        return auth.login(r);
    }

    @GetMapping("/eu")
    public UsuarioResponse eu(Authentication a) {
        return auth.eu(a.getName());
    }
}
