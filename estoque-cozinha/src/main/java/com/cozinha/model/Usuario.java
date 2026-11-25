package com.cozinha.model;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "usuarios")
@Getter @Setter @NoArgsConstructor
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String login;
    @Column(nullable = false)
    private String senhaHash;
    @Column(nullable = false)
    private String nome;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Papel papel;
    private boolean ativo = true;
}
