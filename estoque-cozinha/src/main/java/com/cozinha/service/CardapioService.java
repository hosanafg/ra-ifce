package com.cozinha.service;

import com.cozinha.dto.Dtos.*;
import com.cozinha.exception.RegraNegocioException;
import com.cozinha.model.*;
import com.cozinha.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class CardapioService {
    private final CardapioRepository cardapios;
    private final PratoRepository pratos;
    private final UsuarioRepository usuarios;
    private final EstoqueService estoque;

    /**
     * Cria o cardápio semanal. Só aceita se o estoque (insumos não vencidos) cobrir a soma dos
     * ingredientes de todos os pratos/pesos informados.
     */
    public CardapioResponse criar(CardapioRequest r, String loginNutricionista) {
        Cardapio c = new Cardapio();
        c.setSemanaInicio(r.semanaInicio());
        c.setCriador(usuarios.findByLogin(loginNutricionista).orElse(null));

        Map<Long, Necessidade> total = new LinkedHashMap<>();
        for (ItemCardapioRequest ir : r.itens()) {
            if (ir.dia().isBefore(r.semanaInicio()) || ir.dia().isAfter(r.semanaInicio().plusDays(6)))
                throw RegraNegocioException.invalido("O dia " + ir.dia() + " está fora da semana que começa em " + r.semanaInicio() + ".");
            Prato prato = pratos.findById(ir.pratoId())
                    .orElseThrow(() -> RegraNegocioException.naoEncontrado("Prato " + ir.pratoId()));
            ItemCardapio item = new ItemCardapio();
            item.setCardapio(c);
            item.setPrato(prato);
            item.setDia(ir.dia());
            item.setPesoKg(ir.pesoKg());
            c.getItens().add(item);
            Necessidade.somar(total, prato, ir.pesoKg());
        }
        estoque.validarDisponibilidade(total);
        return Mapeador.cardapio(cardapios.save(c));
    }

    @Transactional(readOnly = true)
    public List<CardapioResponse> listar() {
        return cardapios.findAllByOrderBySemanaInicioDesc().stream().map(Mapeador::cardapio).toList();
    }

    @Transactional(readOnly = true)
    public CardapioResponse buscar(Long id) {
        return Mapeador.cardapio(cardapios.findById(id).orElseThrow(() -> RegraNegocioException.naoEncontrado("Cardápio")));
    }
}
