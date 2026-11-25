package com.cozinha.controller;

import com.cozinha.config.Perfis;
import com.cozinha.dto.Dtos.*;
import com.cozinha.service.AvaliacaoService;
import com.cozinha.service.CardapioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/cardapios")
@RequiredArgsConstructor
public class CardapioController {
    private final CardapioService cardapios;
    private final AvaliacaoService avaliacoes;

    @PostMapping
    @PreAuthorize(Perfis.NUTRICIONISTA)
    public ResponseEntity<CardapioResponse> criar(@Valid @RequestBody CardapioRequest r, Authentication a) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cardapios.criar(r, a.getName()));
    }

    @GetMapping
    @PreAuthorize(Perfis.QUALQUER_CONTA)
    public List<CardapioResponse> listar() { return cardapios.listar(); }

    @GetMapping("/{id}")
    @PreAuthorize(Perfis.QUALQUER_CONTA)
    public CardapioResponse buscar(@PathVariable Long id) { return cardapios.buscar(id); }

    /** Média e quantidade de avaliações de cada prato do cardápio. */
    @GetMapping("/{id}/avaliacoes")
    @PreAuthorize(Perfis.NUTRICIONISTA)
    public List<ResumoAvaliacao> avaliacoes(@PathVariable Long id) { return avaliacoes.resumoDoCardapio(id); }
}
