package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "receitas")
@Getter @Setter @NoArgsConstructor
public class Receita {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "prato_id", unique = true)
    private Prato prato;
    @Column(nullable = false, columnDefinition = "text")
    private String modoPreparo;
    private Integer tempoPreparoMinutos;
    private Integer rendimentoPorcoes;
}
