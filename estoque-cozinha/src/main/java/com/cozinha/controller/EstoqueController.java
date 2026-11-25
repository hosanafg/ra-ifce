package com.cozinha.controller;

import com.cozinha.config.Perfis;
import com.cozinha.dto.Dtos.*;
import com.cozinha.service.EstoqueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/estoque")
@RequiredArgsConstructor
public class EstoqueController {
    private final EstoqueService estoque;

    /** Nota de entrada: o estoquista lança os insumos brutos (alimento, quantidade, lote, validade). */
    @PostMapping("/entradas")
    @PreAuthorize(Perfis.ESTOQUISTA)
    public ResponseEntity<EntradaResponse> entrada(@Valid @RequestBody EntradaRequest r, Authentication a) {
        return ResponseEntity.status(HttpStatus.CREATED).body(estoque.registrarEntrada(r, a.getName()));
    }

    /** Total disponível (não vencido) por alimento. O nutricionista usa isso para montar o cardápio. */
    @GetMapping("/resumo")
    @PreAuthorize(Perfis.QUALQUER_CONTA)
    public List<EstoqueResumo> resumo() { return estoque.resumo(); }

    @GetMapping("/insumos")
    @PreAuthorize(Perfis.ESTOQUISTA)
    public List<InsumoResponse> insumos() { return estoque.listarInsumos(); }
}
