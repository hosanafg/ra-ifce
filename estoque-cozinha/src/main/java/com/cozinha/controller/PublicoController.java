package com.cozinha.controller;

import com.cozinha.dto.Dtos.*;
import com.cozinha.service.AvaliacaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/** Rotas sem login: quem comeu vê os pratos de hoje e dá uma nota (1 a 5) para cada prato. */
@RestController
@RequestMapping("/api/publico")
@RequiredArgsConstructor
public class PublicoController {
    private final AvaliacaoService avaliacoes;

    @GetMapping("/cardapio-hoje")
    public List<ItemCardapioResponse> cardapioDeHoje() { return avaliacoes.cardapioDeHoje(); }

    @PostMapping("/avaliacoes")
    public ResponseEntity<Map<String, String>> avaliar(@Valid @RequestBody AvaliacaoRequest r) {
        avaliacoes.avaliar(r);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("mensagem", "Avaliação registrada. Obrigado!"));
    }
}
