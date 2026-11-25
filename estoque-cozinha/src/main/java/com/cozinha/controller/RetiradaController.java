package com.cozinha.controller;

import com.cozinha.config.Perfis;
import com.cozinha.dto.Dtos.*;
import com.cozinha.service.RetiradaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/retiradas")
@RequiredArgsConstructor
public class RetiradaController {
    private final RetiradaService retiradas;

    /** Gera a nota de retirada (lista consolidada de ingredientes) de um cardápio. */
    @PostMapping("/cardapio/{cardapioId}")
    @PreAuthorize(Perfis.ESTOQUISTA)
    public ResponseEntity<NotaRetiradaResponse> gerar(@PathVariable Long cardapioId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(retiradas.gerar(cardapioId));
    }

    @GetMapping("/{id}")
    @PreAuthorize(Perfis.QUALQUER_CONTA)
    public NotaRetiradaResponse buscar(@PathVariable Long id) { return retiradas.buscar(id); }

    /** Revisão do estoquista: ajusta a quantidade de um item antes de confirmar. */
    @PutMapping("/{id}/itens/{itemId}")
    @PreAuthorize(Perfis.ESTOQUISTA)
    public NotaRetiradaResponse editarItem(@PathVariable Long id, @PathVariable Long itemId,
                                           @Valid @RequestBody EditarItemRetiradaRequest r) {
        return retiradas.editarItem(id, itemId, r.quantidade());
    }

    /** Confirma a retirada: baixa no estoque e status RETIRADA. */
    @PostMapping("/{id}/confirmar")
    @PreAuthorize(Perfis.ESTOQUISTA)
    public NotaRetiradaResponse confirmar(@PathVariable Long id) { return retiradas.confirmar(id); }
}
