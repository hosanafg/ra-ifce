package com.cozinha.service;

import com.cozinha.config.Datas;
import com.cozinha.dto.Dtos.*;
import com.cozinha.exception.RegraNegocioException;
import com.cozinha.model.Avaliacao;
import com.cozinha.model.ItemCardapio;
import com.cozinha.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AvaliacaoService {
    private final AvaliacaoRepository avaliacoes;
    private final ItemCardapioRepository itens;

    /** Pratos servidos hoje (cada um com seu id para ser avaliado individualmente). */
    @Transactional(readOnly = true)
    public List<ItemCardapioResponse> cardapioDeHoje() {
        return itens.findByDiaOrderByIdAsc(Datas.hoje()).stream().map(Mapeador::item).toList();
    }

    public void avaliar(AvaliacaoRequest r) {
        ItemCardapio item = itens.findById(r.itemCardapioId())
                .orElseThrow(() -> RegraNegocioException.naoEncontrado("Prato do cardápio"));
        if (item.getDia().isAfter(Datas.hoje()))
            throw RegraNegocioException.invalido("Esse prato ainda não foi servido.");
        String nome = r.nomeAvaliador().trim();
        if (avaliacoes.existsByItemCardapioIdAndNomeAvaliadorIgnoreCase(item.getId(), nome))
            throw RegraNegocioException.conflito("'" + nome + "' já avaliou este prato.");
        Avaliacao a = new Avaliacao();
        a.setItemCardapio(item);
        a.setNomeAvaliador(nome);
        a.setNota(r.nota());
        a.setCriadaEm(Datas.agora());
        avaliacoes.save(a);
    }

    @Transactional(readOnly = true)
    public List<ResumoAvaliacao> resumoDoCardapio(Long cardapioId) {
        return itens.findByCardapioIdOrderByDiaAscIdAsc(cardapioId).stream()
                .map(i -> new ResumoAvaliacao(i.getId(), i.getPrato().getNome(), i.getDia(),
                        avaliacoes.media(i.getId()), avaliacoes.countByItemCardapioId(i.getId())))
                .toList();
    }
}
