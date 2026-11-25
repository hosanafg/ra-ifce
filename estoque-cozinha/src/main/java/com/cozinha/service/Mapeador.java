package com.cozinha.service;

import com.cozinha.dto.Dtos.*;
import com.cozinha.model.*;
import java.util.List;

/** Converte entidades em DTOs. Chamar sempre dentro de uma transação (há relações lazy). */
public final class Mapeador {
    private Mapeador() {}

    public static UsuarioResponse usuario(Usuario u) {
        return new UsuarioResponse(u.getId(), u.getLogin(), u.getNome(), u.getPapel(), u.isAtivo());
    }

    public static AlimentoResponse alimento(Alimento a) {
        return new AlimentoResponse(a.getId(), a.getNome(), a.getUnidade());
    }

    public static InsumoResponse insumo(Insumo i) {
        return new InsumoResponse(i.getId(), i.getAlimento().getId(), i.getAlimento().getNome(),
                i.getAlimento().getUnidade(), i.getQuantidade(), i.getLote(), i.getValidade(), i.getDataEntrada());
    }

    public static PratoResponse prato(Prato p) {
        List<IngredienteResponse> ficha = p.getFichaTecnica().stream()
                .map(i -> new IngredienteResponse(i.getAlimento().getId(), i.getAlimento().getNome(),
                        i.getAlimento().getUnidade(), i.getQuantidadePorKg()))
                .toList();
        Receita r = p.getReceita();
        ReceitaDto receita = r == null ? null
                : new ReceitaDto(r.getModoPreparo(), r.getTempoPreparoMinutos(), r.getRendimentoPorcoes());
        return new PratoResponse(p.getId(), p.getNome(), ficha, receita);
    }

    public static ItemCardapioResponse item(ItemCardapio i) {
        return new ItemCardapioResponse(i.getId(), i.getPrato().getId(), i.getPrato().getNome(), i.getDia(), i.getPesoKg());
    }

    public static CardapioResponse cardapio(Cardapio c) {
        return new CardapioResponse(c.getId(), c.getSemanaInicio(),
                c.getCriador() == null ? null : c.getCriador().getNome(),
                c.getItens().stream().map(Mapeador::item).toList());
    }

    public static NotaRetiradaResponse nota(NotaRetirada n) {
        return new NotaRetiradaResponse(n.getId(), n.getCardapio().getId(), n.getStatus(), n.getCriadaEm(), n.getRetiradaEm(),
                n.getItens().stream()
                        .map(i -> new ItemRetiradaResponse(i.getId(), i.getAlimento().getId(), i.getAlimento().getNome(),
                                i.getAlimento().getUnidade(), i.getQuantidade()))
                        .toList());
    }
}
