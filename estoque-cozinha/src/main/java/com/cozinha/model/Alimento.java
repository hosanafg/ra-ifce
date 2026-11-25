package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "alimentos")
@Getter @Setter @NoArgsConstructor
public class Alimento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String nome;
    @Column(nullable = false)
    private String unidade = "kg";
}
