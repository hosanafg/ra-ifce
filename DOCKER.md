# Executando com Docker Compose

Serviços:

| Serviço | Descrição | URL |
|---|---|---|
| `backend` | FastAPI (`auth_api`) + EasyOCR (`easyocr`), SQLite em volume | http://localhost:8000 (docs em `/docs`) |
| `frontend` | React (Vite) servido por nginx | http://localhost:5173 |

## Subir

```bash
cp .env.example .env        # opcional (Windows: copy .env.example .env)
docker compose up --build
```

O primeiro build é demorado (instala PyTorch CPU e baixa os modelos do EasyOCR, ~vários GB/min).
Os próximos são rápidos (cache de camadas).

## Parar / limpar

```bash
docker compose down          # mantém o banco (volume db_data)
docker compose down -v       # apaga também o banco
```

## Roteiro de teste

1. **Saúde:** `docker compose ps` → `backend` deve ficar `healthy`. Abra http://localhost:8000/docs.
2. **Cadastro:** http://localhost:5173/cadastro → informe e-mail e senha.
   Sem SMTP, o código de verificação aparece no log: `docker compose logs -f backend`
   (linha `[DEV] Código de verificação para ...`). Digite o código para concluir.
3. **Login (2 etapas):** e-mail → senha. Deve redirecionar para `/calendario`.
4. **Recuperação de senha:** `/recuperar-senha` → e-mail cadastrado. Sem SMTP, copie do log o link
   `[DEV] Link de recuperação ...: http://localhost:5173/nova-senha?token=...`, abra, defina a nova senha e entre.
5. **Calendário:** alterne Mês / Semana / Dia; use "+ Adicionar refeição".
6. **Dashboard:** no modo Dia clique em "✏ Editar"; abra a barra lateral direita (‹) → "+ Novo Alimento".
7. **OCR:** em "Novo Alimento", envie uma foto ou PDF de até 5 MB (ex.: uma lista com `1 banana amassada`).
   Clique em "Extrair dados automaticamente"; os alimentos, quantidades, pesos e validades reconhecidos
   preenchem os campos (o restante fica em branco). Teste também um `.txt` renomeado para `.png` e um arquivo > 5 MB:
   devem ser recusados antes do OCR (`docker compose logs backend` não mostra processamento).
8. **Campo extra:** "+ Adicionar campo" → `Marca`; salve e confira na tabela do Dashboard.
9. **Persistência:** `docker compose restart backend` e confirme que os dados continuam.

## SMTP real (opcional)

Preencha no `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
(Gmail: use senha de app) e rode `docker compose up -d --force-recreate backend`.

## Observações

- `VITE_API_URL` é embutida **no build** do frontend; se mudar, rode `docker compose build frontend`.
- Para acessar de outra máquina, ajuste `VITE_API_URL`, `CORS_ORIGINS` e `FRONTEND_URL` no `.env`.
- Troque `PEPPER` por um segredo próprio antes de usar fora de desenvolvimento.
- O cache de sessão é em memória (um único worker). Para escalar, configure `REDIS_URL`.
