package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "itens_retirada")
@Getter @Setter @NoArgsConstructor
public class ItemRetirada {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "nota_id")
    private NotaRetirada nota;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "alimento_id")
    private Alimento alimento;
    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantidade;
}
