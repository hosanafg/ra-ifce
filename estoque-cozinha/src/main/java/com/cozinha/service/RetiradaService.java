package com.cozinha.service;

import com.cozinha.config.Datas;
import com.cozinha.dto.Dtos.*;
import com.cozinha.exception.RegraNegocioException;
import com.cozinha.model.*;
import com.cozinha.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class RetiradaService {
    private final NotaRetiradaRepository notas;
    private final CardapioRepository cardapios;
    private final EstoqueService estoque;

    /** Criação da nota de retirada: consolida os ingredientes de todas as fichas técnicas do cardápio. */
    public NotaRetiradaResponse gerar(Long cardapioId) {
        Cardapio cardapio = cardapios.findById(cardapioId).orElseThrow(() -> RegraNegocioException.naoEncontrado("Cardápio"));
        if (notas.existsByCardapioId(cardapioId))
            throw RegraNegocioException.conflito("Esse cardápio já possui nota de retirada.");

        Map<Long, Necessidade> lista = new LinkedHashMap<>();
        for (ItemCardapio item : cardapio.getItens()) Necessidade.somar(lista, item.getPrato(), item.getPesoKg());

        NotaRetirada nota = new NotaRetirada();
        nota.setCardapio(cardapio);
        nota.setStatus(StatusNota.RASCUNHO);
        nota.setCriadaEm(Datas.agora());
        for (Necessidade n : lista.values()) {
            ItemRetirada ir = new ItemRetirada();
            ir.setNota(nota);
            ir.setAlimento(n.alimento);
            ir.setQuantidade(n.quantidade);
            nota.getItens().add(ir);
        }
        return Mapeador.nota(notas.save(nota));
    }

    /** O estoquista revisa a lista e pode editar a quantidade se algo for diferente do previsto. */
    public NotaRetiradaResponse editarItem(Long notaId, Long itemId, BigDecimal quantidade) {
        NotaRetirada nota = obter(notaId);
        exigirRascunho(nota);
        ItemRetirada item = nota.getItens().stream().filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> RegraNegocioException.naoEncontrado("Item da nota"));
        item.setQuantidade(quantidade);
        return Mapeador.nota(nota);
    }

    /** Remoção da nota de retirada: dá baixa nos insumos (PEPS) e muda o status para RETIRADA. Tudo ou nada. */
    public NotaRetiradaResponse confirmar(Long notaId) {
        NotaRetirada nota = obter(notaId);
        exigirRascunho(nota);
        var hoje = Datas.hoje();
        for (ItemRetirada item : nota.getItens()) estoque.consumir(item.getAlimento(), item.getQuantidade(), hoje);
        nota.setStatus(StatusNota.RETIRADA);
        nota.setRetiradaEm(Datas.agora());
        return Mapeador.nota(nota);
    }

    @Transactional(readOnly = true)
    public NotaRetiradaResponse buscar(Long id) {
        return Mapeador.nota(obter(id));
    }

    private NotaRetirada obter(Long id) {
        return notas.findById(id).orElseThrow(() -> RegraNegocioException.naoEncontrado("Nota de retirada"));
    }

    private void exigirRascunho(NotaRetirada n) {
        if (n.getStatus() == StatusNota.RETIRADA)
            throw RegraNegocioException.conflito("Esta nota já foi retirada e não pode mais ser alterada.");
    }
}
