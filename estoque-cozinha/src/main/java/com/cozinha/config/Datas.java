package com.cozinha.config;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

public final class Datas {
    public static final ZoneId ZONA = ZoneId.of("America/Fortaleza");
    private Datas() {}
    public static LocalDate hoje() { return LocalDate.now(ZONA); }
    public static LocalDateTime agora() { return LocalDateTime.now(ZONA); }
}
