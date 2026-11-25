package com.cozinha.repository;

import com.cozinha.model.Insumo;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface InsumoRepository extends JpaRepository<Insumo, Long> {

    /** Insumos utilizáveis (não vencidos) de um alimento, do que vence primeiro ao último (PEPS). Trava as linhas. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Insumo i where i.alimento.id = :alimentoId and i.validade >= :hoje and i.quantidade > 0 order by i.validade asc, i.id asc")
    List<Insumo> disponiveisPeps(@Param("alimentoId") Long alimentoId, @Param("hoje") LocalDate hoje);

    @Query("select sum(i.quantidade) from Insumo i where i.alimento.id = :alimentoId and i.validade >= :hoje")
    BigDecimal somaDisponivel(@Param("alimentoId") Long alimentoId, @Param("hoje") LocalDate hoje);

    default BigDecimal totalDisponivel(Long alimentoId, LocalDate hoje) {
        BigDecimal s = somaDisponivel(alimentoId, hoje);
        return s == null ? BigDecimal.ZERO : s;
    }

    @Query("select i.alimento.id, i.alimento.nome, i.alimento.unidade, sum(i.quantidade) from Insumo i " +
           "where i.validade >= :hoje group by i.alimento.id, i.alimento.nome, i.alimento.unidade order by i.alimento.nome")
    List<Object[]> resumoDisponivel(@Param("hoje") LocalDate hoje);

    List<Insumo> findAllByOrderByValidadeAscIdAsc();
}
