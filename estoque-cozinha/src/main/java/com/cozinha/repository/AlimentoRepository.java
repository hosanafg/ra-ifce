package com.cozinha.repository;

import com.cozinha.model.Alimento;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AlimentoRepository extends JpaRepository<Alimento, Long> {
    Optional<Alimento> findByNomeIgnoreCase(String nome);
}
