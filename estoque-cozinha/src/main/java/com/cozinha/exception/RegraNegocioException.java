package com.cozinha.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class RegraNegocioException extends RuntimeException {
    private final HttpStatus status;

    public RegraNegocioException(String mensagem, HttpStatus status) {
        super(mensagem);
        this.status = status;
    }

    public static RegraNegocioException naoEncontrado(String o) {
        return new RegraNegocioException(o + " não encontrado(a).", HttpStatus.NOT_FOUND);
    }
    public static RegraNegocioException invalido(String m) {
        return new RegraNegocioException(m, HttpStatus.BAD_REQUEST);
    }
    public static RegraNegocioException conflito(String m) {
        return new RegraNegocioException(m, HttpStatus.CONFLICT);
    }
}
