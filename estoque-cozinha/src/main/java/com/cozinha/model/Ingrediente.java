package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity @Table(name = "ingredientes")
@Getter @Setter @NoArgsConstructor
public class Ingrediente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "prato_id")
    private Prato prato;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "alimento_id")
    private Alimento alimento;
    /** Quantidade do alimento (na unidade dele) necessária para produzir 1 kg do prato. */
    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantidadePorKg;
}
