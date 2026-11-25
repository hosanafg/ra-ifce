package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "notas_entrada")
@Getter @Setter @NoArgsConstructor
public class NotaEntrada {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private LocalDate dataEntrada;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "responsavel_id")
    private Usuario responsavel;
    @OneToMany(mappedBy = "notaEntrada", cascade = CascadeType.ALL)
    private List<Insumo> insumos = new ArrayList<>();
}
