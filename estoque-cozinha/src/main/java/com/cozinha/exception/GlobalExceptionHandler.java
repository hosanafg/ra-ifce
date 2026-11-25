package com.cozinha.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    public record Erro(int status, String mensagem, Object detalhes, Instant timestamp) {}

    private ResponseEntity<Erro> erro(HttpStatus s, String msg, Object det) {
        return ResponseEntity.status(s).body(new Erro(s.value(), msg, det, Instant.now()));
    }

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<Erro> regra(RegraNegocioException e) {
        return erro(e.getStatus(), e.getMessage(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Erro> validacao(MethodArgumentNotValidException e) {
        Map<String, String> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> campos.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return erro(HttpStatus.BAD_REQUEST, "Dados inválidos.", campos);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Erro> corpo(HttpMessageNotReadableException e) {
        return erro(HttpStatus.BAD_REQUEST, "Corpo da requisição ilegível ou com formato inválido.", null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Erro> integridade(DataIntegrityViolationException e) {
        return erro(HttpStatus.CONFLICT, "Operação viola uma restrição do banco (registro duplicado ou em uso).", null);
    }
}
