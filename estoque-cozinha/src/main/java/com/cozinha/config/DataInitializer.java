package com.cozinha.config;

import com.cozinha.model.Papel;
import com.cozinha.model.Usuario;
import com.cozinha.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Cria o primeiro admin (variáveis ADMIN_LOGIN / ADMIN_SENHA) se ainda não existir. */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    @Value("${app.admin.login}") private String login;
    @Value("${app.admin.senha}") private String senha;

    @Override
    public void run(String... args) {
        String l = login.trim().toLowerCase();
        if (usuarios.existsByLogin(l)) return;
        Usuario u = new Usuario();
        u.setLogin(l);
        u.setNome("Administrador");
        u.setPapel(Papel.ADMIN);
        u.setSenhaHash(encoder.encode(senha));
        usuarios.save(u);
        log.info("Admin inicial '{}' criado.", l);
    }
}
