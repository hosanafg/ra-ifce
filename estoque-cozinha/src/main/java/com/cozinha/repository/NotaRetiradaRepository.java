package com.cozinha.repository;

import com.cozinha.model.NotaRetirada;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotaRetiradaRepository extends JpaRepository<NotaRetirada, Long> {
    boolean existsByCardapioId(Long cardapioId);
}
