package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Um prato servido em um dia específico, com o peso (kg) a produzir. */
@Entity @Table(name = "itens_cardapio")
@Getter @Setter @NoArgsConstructor
public class ItemCardapio {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "cardapio_id")
    private Cardapio cardapio;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "prato_id")
    private Prato prato;
    @Column(nullable = false)
    private LocalDate dia;
    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal pesoKg;
}
