package com.cozinha.controller;

import com.cozinha.config.Perfis;
import com.cozinha.dto.Dtos.*;
import com.cozinha.service.EstoqueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/alimentos")
@RequiredArgsConstructor
public class AlimentoController {
    private final EstoqueService estoque;

    @GetMapping
    @PreAuthorize(Perfis.QUALQUER_CONTA)
    public List<AlimentoResponse> listar() { return estoque.listarAlimentos(); }

    @PostMapping
    @PreAuthorize(Perfis.ESTOQUISTA)
    public ResponseEntity<AlimentoResponse> criar(@Valid @RequestBody AlimentoRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estoque.criarAlimento(r));
    }
}
