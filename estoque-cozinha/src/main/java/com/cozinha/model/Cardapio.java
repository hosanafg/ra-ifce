package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "cardapios")
@Getter @Setter @NoArgsConstructor
public class Cardapio {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private LocalDate semanaInicio;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "criador_id")
    private Usuario criador;
    @OneToMany(mappedBy = "cardapio", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dia ASC, id ASC")
    private List<ItemCardapio> itens = new ArrayList<>();
}
