package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "notas_retirada")
@Getter @Setter @NoArgsConstructor
public class NotaRetirada {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "cardapio_id", unique = true)
    private Cardapio cardapio;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private StatusNota status = StatusNota.RASCUNHO;
    @Column(nullable = false)
    private LocalDateTime criadaEm;
    private LocalDateTime retiradaEm;
    @OneToMany(mappedBy = "nota", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ItemRetirada> itens = new ArrayList<>();
}
