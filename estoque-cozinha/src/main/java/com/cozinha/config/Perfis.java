package com.cozinha.config;

/** Expressões usadas em @PreAuthorize. O ADMIN passa em todas. */
public final class Perfis {
    public static final String ADMIN = "hasRole('ADMIN')";
    public static final String ESTOQUISTA = "hasAnyRole('ADMIN','ESTOQUISTA')";
    public static final String NUTRICIONISTA = "hasAnyRole('ADMIN','NUTRICIONISTA')";
    public static final String QUALQUER_CONTA = "hasAnyRole('ADMIN','ESTOQUISTA','NUTRICIONISTA')";
    private Perfis() {}
}
