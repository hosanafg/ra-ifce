package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "pratos")
@Getter @Setter @NoArgsConstructor
public class Prato {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String nome;
    @OneToOne(mappedBy = "prato", cascade = CascadeType.ALL, orphanRemoval = true)
    private Receita receita;
    /** Ficha técnica = lista de ingredientes do prato. */
    @OneToMany(mappedBy = "prato", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Ingrediente> fichaTecnica = new ArrayList<>();
}
