package com.cozinha.repository;

import com.cozinha.model.Avaliacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AvaliacaoRepository extends JpaRepository<Avaliacao, Long> {
    boolean existsByItemCardapioIdAndNomeAvaliadorIgnoreCase(Long itemCardapioId, String nomeAvaliador);
    long countByItemCardapioId(Long itemCardapioId);

    @Query("select avg(a.nota) from Avaliacao a where a.itemCardapio.id = :id")
    Double media(@Param("id") Long itemCardapioId);
}
