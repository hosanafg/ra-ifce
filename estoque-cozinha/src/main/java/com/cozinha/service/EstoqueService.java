package com.cozinha.service;

import com.cozinha.config.Datas;
import com.cozinha.dto.Dtos.*;
import com.cozinha.exception.RegraNegocioException;
import com.cozinha.model.*;
import com.cozinha.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class EstoqueService {
    private final AlimentoRepository alimentos;
    private final InsumoRepository insumos;
    private final NotaEntradaRepository notasEntrada;
    private final UsuarioRepository usuarios;

    // ---------- Alimentos (classe Alimento) ----------
    @Transactional(readOnly = true)
    public List<AlimentoResponse> listarAlimentos() {
        return alimentos.findAll().stream().map(Mapeador::alimento).toList();
    }

    public AlimentoResponse criarAlimento(AlimentoRequest r) {
        return Mapeador.alimento(cadastrarAlimento(r));
    }

    private Alimento cadastrarAlimento(AlimentoRequest r) {
        String nome = r.nome().trim();
        if (alimentos.findByNomeIgnoreCase(nome).isPresent())
            throw RegraNegocioException.conflito("Já existe um alimento chamado '" + nome + "'.");
        Alimento a = new Alimento();
        a.setNome(nome);
        a.setUnidade(r.unidade() == null || r.unidade().isBlank() ? "kg" : r.unidade().trim());
        return alimentos.save(a);
    }

    // ---------- Nota de entrada / adicionar insumos ----------
    public EntradaResponse registrarEntrada(EntradaRequest req, String loginResponsavel) {
        NotaEntrada nota = new NotaEntrada();
        nota.setDataEntrada(req.dataEntrada() != null ? req.dataEntrada() : Datas.hoje());
        nota.setResponsavel(usuarios.findByLogin(loginResponsavel).orElse(null));

        for (ItemEntradaRequest item : req.itens()) {
            if (item.validade().isBefore(nota.getDataEntrada()))
                throw RegraNegocioException.invalido("Insumo com lote '" + item.lote() + "' já está vencido.");
            Insumo insumo = new Insumo();
            insumo.setAlimento(resolverAlimento(item));
            insumo.setQuantidade(item.quantidade());
            insumo.setLote(item.lote().trim());
            insumo.setValidade(item.validade());
            insumo.setDataEntrada(nota.getDataEntrada());   // data de entrada do insumo = data de entrada da nota
            insumo.setNotaEntrada(nota);
            nota.getInsumos().add(insumo);
        }
        notasEntrada.save(nota);   // salva a nota e, em cascata, os insumos no estoque
        return new EntradaResponse(nota.getId(), nota.getDataEntrada(),
                nota.getInsumos().stream().map(Mapeador::insumo).toList());
    }

    /** Alimento não cadastrado? Cadastra na hora (fluxo "Adicionar Alimento" do diagrama). */
    private Alimento resolverAlimento(ItemEntradaRequest item) {
        if (item.alimentoId() != null)
            return alimentos.findById(item.alimentoId()).orElseThrow(() -> RegraNegocioException.naoEncontrado("Alimento"));
        if (item.novoAlimento() != null)
            return alimentos.findByNomeIgnoreCase(item.novoAlimento().nome().trim())
                    .orElseGet(() -> cadastrarAlimento(item.novoAlimento()));
        throw RegraNegocioException.invalido("Informe alimentoId ou novoAlimento em cada item.");
    }

    // ---------- Consultas ----------
    @Transactional(readOnly = true)
    public List<EstoqueResumo> resumo() {
        return insumos.resumoDisponivel(Datas.hoje()).stream()
                .map(l -> new EstoqueResumo((Long) l[0], (String) l[1], (String) l[2], (BigDecimal) l[3]))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InsumoResponse> listarInsumos() {
        return insumos.findAllByOrderByValidadeAscIdAsc().stream().map(Mapeador::insumo).toList();
    }

    /** Compara a necessidade com o que há de insumo não vencido. Retorna mensagens do que falta. */
    @Transactional(readOnly = true)
    public List<String> calcularFaltas(Map<Long, Necessidade> necessidades) {
        LocalDate hoje = Datas.hoje();
        List<String> faltas = new ArrayList<>();
        for (Necessidade n : necessidades.values()) {
            BigDecimal disponivel = insumos.totalDisponivel(n.alimento.getId(), hoje);
            if (disponivel.compareTo(n.quantidade) < 0)
                faltas.add(n.alimento.getNome() + ": necessário " + fmt(n.quantidade) + " " + n.alimento.getUnidade()
                        + ", disponível " + fmt(disponivel));
        }
        return faltas;
    }

    public void validarDisponibilidade(Map<Long, Necessidade> necessidades) {
        List<String> faltas = calcularFaltas(necessidades);
        if (!faltas.isEmpty())
            throw RegraNegocioException.conflito("Insumos insuficientes -> " + String.join("; ", faltas));
    }

    // ---------- Baixa de estoque (Remoção da nota de retirada) ----------
    /**
     * Consome 'necessario' do alimento, usando primeiro os lotes que vencem antes (PEPS):
     *  - se a quantidade do ingrediente < quantidade do insumo: insumo fica com (qtd_insumo - qtd_ingrediente);
     *  - senão: o insumo é removido e sua quantidade é subtraída do ingrediente; procura o próximo insumo;
     *  - repete enquanto a quantidade restante do ingrediente for > 0.
     * Se o estoque acabar antes, lança exceção e a transação inteira é desfeita.
     */
    public void consumir(Alimento alimento, BigDecimal necessario, LocalDate hoje) {
        BigDecimal restante = necessario;
        for (Insumo insumo : insumos.disponiveisPeps(alimento.getId(), hoje)) {
            if (restante.signum() <= 0) break;
            if (restante.compareTo(insumo.getQuantidade()) < 0) {
                insumo.setQuantidade(insumo.getQuantidade().subtract(restante));
                restante = BigDecimal.ZERO;
            } else {
                restante = restante.subtract(insumo.getQuantidade());
                insumos.delete(insumo);
            }
        }
        if (restante.signum() > 0)
            throw new RegraNegocioException("Estoque insuficiente de '" + alimento.getNome() + "': faltam "
                    + fmt(restante) + " " + alimento.getUnidade() + ".", HttpStatus.CONFLICT);
    }

    private static String fmt(BigDecimal v) { return v.stripTrailingZeros().toPlainString(); }
}
