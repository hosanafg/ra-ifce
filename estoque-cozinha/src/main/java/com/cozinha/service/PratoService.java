package com.cozinha.service;

import com.cozinha.dto.Dtos.*;
import com.cozinha.exception.RegraNegocioException;
import com.cozinha.model.*;
import com.cozinha.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class PratoService {
    private final PratoRepository pratos;
    private final AlimentoRepository alimentos;
    private final EstoqueService estoque;

    /** Fluxo "criar novo prato": dados do Prato + ficha técnica (ingredientes) + dados da Receita. */
    public PratoResponse criar(PratoRequest r) {
        String nome = r.nome().trim();
        if (pratos.existsByNomeIgnoreCase(nome)) throw RegraNegocioException.conflito("Já existe um prato com esse nome.");

        Prato prato = new Prato();
        prato.setNome(nome);

        Set<Long> vistos = new HashSet<>();
        for (IngredienteRequest ir : r.fichaTecnica()) {
            if (!vistos.add(ir.alimentoId()))
                throw RegraNegocioException.invalido("Alimento repetido na ficha técnica (id " + ir.alimentoId() + ").");
            Ingrediente ing = new Ingrediente();
            ing.setPrato(prato);
            ing.setAlimento(alimentos.findById(ir.alimentoId()).orElseThrow(() -> RegraNegocioException.naoEncontrado("Alimento " + ir.alimentoId())));
            ing.setQuantidadePorKg(ir.quantidadePorKg());
            prato.getFichaTecnica().add(ing);
        }

        Receita receita = new Receita();
        receita.setPrato(prato);
        receita.setModoPreparo(r.receita().modoPreparo());
        receita.setTempoPreparoMinutos(r.receita().tempoPreparoMinutos());
        receita.setRendimentoPorcoes(r.receita().rendimentoPorcoes());
        prato.setReceita(receita);

        return Mapeador.prato(pratos.save(prato));
    }

    @Transactional(readOnly = true)
    public List<PratoResponse> listar() {
        return pratos.findAll().stream().map(Mapeador::prato).toList();
    }

    @Transactional(readOnly = true)
    public PratoResponse buscar(Long id) {
        return Mapeador.prato(obter(id));
    }

    /** Dá para produzir 'pesoKg' deste prato com o estoque atual (insumos não vencidos)? */
    @Transactional(readOnly = true)
    public DisponibilidadeResponse disponibilidade(Long id, BigDecimal pesoKg) {
        Map<Long, Necessidade> n = new LinkedHashMap<>();
        Necessidade.somar(n, obter(id), pesoKg);
        List<String> faltas = estoque.calcularFaltas(n);
        return new DisponibilidadeResponse(faltas.isEmpty(), faltas);
    }

    /** Pratos que podem ser produzidos agora com o estoque (apoio para o nutricionista montar o cardápio). */
    @Transactional(readOnly = true)
    public List<PratoResponse> disponiveis(BigDecimal pesoKg) {
        List<PratoResponse> ok = new ArrayList<>();
        for (Prato p : pratos.findAll()) {
            Map<Long, Necessidade> n = new LinkedHashMap<>();
            Necessidade.somar(n, p, pesoKg);
            if (estoque.calcularFaltas(n).isEmpty()) ok.add(Mapeador.prato(p));
        }
        return ok;
    }

    private Prato obter(Long id) {
        return pratos.findById(id).orElseThrow(() -> RegraNegocioException.naoEncontrado("Prato"));
    }
}
