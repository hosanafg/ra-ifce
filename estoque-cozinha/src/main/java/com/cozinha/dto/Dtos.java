package com.cozinha.dto;

import com.cozinha.model.Papel;
import com.cozinha.model.StatusNota;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class Dtos {
    private Dtos() {}

    // ---- contas ----
    public record RegistroRequest(
            @NotBlank @Size(min = 3, max = 50) String login,
            @NotBlank @Size(min = 6, max = 100) String senha,
            @NotBlank @Size(max = 100) String nome,
            @NotNull Papel papel) {}
    public record LoginRequest(@NotBlank String login, @NotBlank String senha) {}
    public record UsuarioResponse(Long id, String login, String nome, Papel papel, boolean ativo) {}
    public record TokenResponse(String token, String tipo, long expiraEmMinutos, UsuarioResponse usuario) {}
    public record AlterarUsuarioRequest(@Size(max = 100) String nome, Papel papel, Boolean ativo,
                                        @Size(min = 6, max = 100) String novaSenha) {}

    // ---- alimentos / estoque ----
    public record AlimentoRequest(@NotBlank @Size(max = 100) String nome, @Size(max = 20) String unidade) {}
    public record AlimentoResponse(Long id, String nome, String unidade) {}

    /** Informe alimentoId (já cadastrado) OU novoAlimento (cadastra na hora, como no diagrama). */
    public record ItemEntradaRequest(
            Long alimentoId,
            @Valid AlimentoRequest novoAlimento,
            @NotNull @Positive BigDecimal quantidade,
            @NotBlank String lote,
            @NotNull LocalDate validade) {}
    public record EntradaRequest(LocalDate dataEntrada, @NotEmpty List<@Valid ItemEntradaRequest> itens) {}
    public record InsumoResponse(Long id, Long alimentoId, String alimento, String unidade, BigDecimal quantidade,
                                 String lote, LocalDate validade, LocalDate dataEntrada) {}
    public record EntradaResponse(Long notaId, LocalDate dataEntrada, List<InsumoResponse> insumos) {}
    public record EstoqueResumo(Long alimentoId, String alimento, String unidade, BigDecimal quantidadeDisponivel) {}

    // ---- pratos ----
    public record IngredienteRequest(@NotNull Long alimentoId, @NotNull @Positive BigDecimal quantidadePorKg) {}
    public record ReceitaDto(@NotBlank String modoPreparo, Integer tempoPreparoMinutos, Integer rendimentoPorcoes) {}
    public record PratoRequest(@NotBlank @Size(max = 150) String nome,
                               @NotEmpty List<@Valid IngredienteRequest> fichaTecnica,
                               @NotNull @Valid ReceitaDto receita) {}
    public record IngredienteResponse(Long alimentoId, String alimento, String unidade, BigDecimal quantidadePorKg) {}
    public record PratoResponse(Long id, String nome, List<IngredienteResponse> fichaTecnica, ReceitaDto receita) {}
    public record DisponibilidadeResponse(boolean possivel, List<String> faltas) {}

    // ---- cardápio ----
    public record ItemCardapioRequest(@NotNull Long pratoId, @NotNull LocalDate dia, @NotNull @Positive BigDecimal pesoKg) {}
    public record CardapioRequest(@NotNull LocalDate semanaInicio, @NotEmpty List<@Valid ItemCardapioRequest> itens) {}
    public record ItemCardapioResponse(Long id, Long pratoId, String prato, LocalDate dia, BigDecimal pesoKg) {}
    public record CardapioResponse(Long id, LocalDate semanaInicio, String criadoPor, List<ItemCardapioResponse> itens) {}

    // ---- nota de retirada ----
    public record ItemRetiradaResponse(Long id, Long alimentoId, String alimento, String unidade, BigDecimal quantidade) {}
    public record NotaRetiradaResponse(Long id, Long cardapioId, StatusNota status, LocalDateTime criadaEm,
                                       LocalDateTime retiradaEm, List<ItemRetiradaResponse> itens) {}
    public record EditarItemRetiradaRequest(@NotNull @PositiveOrZero BigDecimal quantidade) {}

    // ---- avaliações ----
    public record AvaliacaoRequest(@NotNull Long itemCardapioId,
                                   @NotBlank @Size(max = 100) String nomeAvaliador,
                                   @NotNull @Min(1) @Max(5) Integer nota) {}
    public record ResumoAvaliacao(Long itemCardapioId, String prato, LocalDate dia, Double media, long totalAvaliacoes) {}
}
