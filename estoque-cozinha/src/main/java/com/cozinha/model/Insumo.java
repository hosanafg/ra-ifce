package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Item físico em estoque (alimento + lote + validade). É removido quando totalmente consumido. */
@Entity @Table(name = "insumos")
@Getter @Setter @NoArgsConstructor
public class Insumo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "alimento_id")
    private Alimento alimento;
    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantidade;
    @Column(nullable = false)
    private String lote;
    @Column(nullable = false)
    private LocalDate validade;
    @Column(nullable = false)
    private LocalDate dataEntrada;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "nota_entrada_id")
    private NotaEntrada notaEntrada;
}
