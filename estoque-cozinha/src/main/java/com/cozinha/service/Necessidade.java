package com.cozinha.service;

import com.cozinha.model.Alimento;
import com.cozinha.model.Ingrediente;
import com.cozinha.model.Prato;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/** Quantidade total necessária de um alimento (lista consolidada de ingredientes). */
public class Necessidade {
    public final Alimento alimento;
    public BigDecimal quantidade;

    public Necessidade(Alimento alimento, BigDecimal quantidade) {
        this.alimento = alimento;
        this.quantidade = quantidade;
    }

    /**
     * Passo do diagrama "Criação de Nota de Retirada": percorre a ficha técnica, um ingrediente por vez;
     * se o ingrediente já está na lista soma a quantidade, senão adiciona ao final.
     */
    public static void somar(Map<Long, Necessidade> lista, Prato prato, BigDecimal pesoKg) {
        for (Ingrediente ing : prato.getFichaTecnica()) {
            BigDecimal q = ing.getQuantidadePorKg().multiply(pesoKg).setScale(3, RoundingMode.UP);
            lista.merge(ing.getAlimento().getId(), new Necessidade(ing.getAlimento(), q),
                    (existente, novo) -> { existente.quantidade = existente.quantidade.add(novo.quantidade); return existente; });
        }
    }
}
