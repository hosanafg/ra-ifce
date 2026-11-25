package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "avaliacoes", uniqueConstraints = @UniqueConstraint(columnNames = {"item_cardapio_id", "nomeAvaliador"}))
@Getter @Setter @NoArgsConstructor
public class Avaliacao {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "item_cardapio_id")
    private ItemCardapio itemCardapio;
    @Column(nullable = false, length = 100)
    private String nomeAvaliador;
    @Column(nullable = false)
    private int nota;
    @Column(nullable = false)
    private LocalDateTime criadaEm;
}
