package com.cozinha.repository;

import com.cozinha.model.ItemCardapio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ItemCardapioRepository extends JpaRepository<ItemCardapio, Long> {
    List<ItemCardapio> findByDiaOrderByIdAsc(LocalDate dia);
    List<ItemCardapio> findByCardapioIdOrderByDiaAscIdAsc(Long cardapioId);
}
