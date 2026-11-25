package com.cozinha.controller;

import com.cozinha.config.Perfis;
import com.cozinha.dto.Dtos.*;
import com.cozinha.service.PratoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/pratos")
@RequiredArgsConstructor
public class PratoController {
    private final PratoService pratos;

    @PostMapping
    @PreAuthorize(Perfis.NUTRICIONISTA)
    public ResponseEntity<PratoResponse> criar(@Valid @RequestBody PratoRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pratos.criar(r));
    }

    @GetMapping
    @PreAuthorize(Perfis.QUALQUER_CONTA)
    public List<PratoResponse> listar() { return pratos.listar(); }

    /** Pratos que o estoque atual consegue produzir no peso informado (padrão 1 kg). */
    @GetMapping("/disponiveis")
    @PreAuthorize(Perfis.NUTRICIONISTA)
    public List<PratoResponse> disponiveis(@RequestParam(defaultValue = "1") BigDecimal pesoKg) {
        return pratos.disponiveis(pesoKg);
    }

    @GetMapping("/{id}")
    @PreAuthorize(Perfis.QUALQUER_CONTA)
    public PratoResponse buscar(@PathVariable Long id) { return pratos.buscar(id); }

    @GetMapping("/{id}/disponibilidade")
    @PreAuthorize(Perfis.NUTRICIONISTA)
    public DisponibilidadeResponse disponibilidade(@PathVariable Long id, @RequestParam(defaultValue = "1") BigDecimal pesoKg) {
        return pratos.disponibilidade(id, pesoKg);
    }
}
