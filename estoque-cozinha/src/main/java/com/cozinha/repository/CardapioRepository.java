package com.cozinha.repository;

import com.cozinha.model.Cardapio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CardapioRepository extends JpaRepository<Cardapio, Long> {
    List<Cardapio> findAllByOrderBySemanaInicioDesc();
}
