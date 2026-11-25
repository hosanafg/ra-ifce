package com.cozinha.repository;

import com.cozinha.model.Prato;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PratoRepository extends JpaRepository<Prato, Long> {
    boolean existsByNomeIgnoreCase(String nome);
}
