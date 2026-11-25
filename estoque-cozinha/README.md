# Estoque & Cardápio — Backend (Java 17 + Spring Boot 3 + PostgreSQL/Supabase)

## Como rodar
1. Crie um projeto no Supabase e copie os dados de conexão (Project Settings > Database).
   Use a conexão **Direct** ou **Session pooler** (porta 5432). Se usar o *Transaction pooler* (6543),
   acrescente `&prepareThreshold=0` à URL JDBC.
2. Defina as variáveis de ambiente (veja `.env.example`):
   `SUPABASE_DB_URL`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `JWT_SECRET` (32+ caracteres), `ADMIN_SENHA`.
3. `mvn spring-boot:run` (as tabelas são criadas sozinhas — `ddl-auto: update`).
4. No primeiro start é criado o admin (`ADMIN_LOGIN`, padrão `admin`, com a senha de `ADMIN_SENHA`).

Todas as rotas protegidas usam `Authorization: Bearer <token>` (token vem do login).

## Perfis
| Perfil | Pode |
|---|---|
| ADMIN | tudo + gerenciar contas (`/api/admin/usuarios`), redefinir senha, desativar, gerar token de suporte |
| ESTOQUISTA | cadastrar alimentos, lançar nota de entrada, gerar/editar/confirmar nota de retirada, ver estoque |
| NUTRICIONISTA | criar pratos, criar cardápios (validados contra o estoque), ver pratos possíveis, ver notas dos pratos |
| Público (sem login) | ver cardápio de hoje e avaliar cada prato (nome + nota 1–5) |

## Rotas
| Método | Rota | Quem | O que faz |
|---|---|---|---|
| POST | /api/auth/registrar | público | cria conta (ESTOQUISTA ou NUTRICIONISTA) |
| POST | /api/auth/login | público | devolve o token |
| GET | /api/auth/eu | logado | dados da conta |
| GET/POST | /api/admin/usuarios | admin | listar / criar qualquer tipo de conta |
| PUT/DELETE | /api/admin/usuarios/{id} | admin | editar (nome, papel, ativo, novaSenha) / desativar |
| POST | /api/admin/usuarios/{id}/token-suporte | admin | entra como aquela conta (fica em log) |
| GET/POST | /api/alimentos | todos / estoquista | listar / cadastrar alimento |
| POST | /api/estoque/entradas | estoquista | **nota de entrada** (itens com alimentoId ou novoAlimento) |
| GET | /api/estoque/resumo | todos | total disponível por alimento |
| GET | /api/estoque/insumos | estoquista | lotes em estoque |
| POST | /api/pratos | nutricionista | **criar novo prato** (prato + ficha técnica + receita) |
| GET | /api/pratos, /api/pratos/{id} | todos | consulta |
| GET | /api/pratos/disponiveis?pesoKg=1 | nutricionista | pratos que o estoque cobre |
| GET | /api/pratos/{id}/disponibilidade?pesoKg= | nutricionista | falta algo para esse prato? |
| POST | /api/cardapios | nutricionista | **criar cardápio semanal** (rejeita se faltar insumo) |
| GET | /api/cardapios, /api/cardapios/{id} | todos | consulta |
| GET | /api/cardapios/{id}/avaliacoes | nutricionista | média por prato |
| POST | /api/retiradas/cardapio/{id} | estoquista | **criar nota de retirada** (consolida ingredientes) |
| PUT | /api/retiradas/{id}/itens/{itemId} | estoquista | revisar/editar quantidade |
| POST | /api/retiradas/{id}/confirmar | estoquista | **baixa no estoque** (PEPS) → status RETIRADA |
| GET | /api/publico/cardapio-hoje | público | pratos de hoje (com `id` do item) |
| POST | /api/publico/avaliacoes | público | `{itemCardapioId, nomeAvaliador, nota}` |

## Exemplo rápido
```bash
curl -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"login":"admin","senha":"SUA_SENHA"}'

# nota de entrada cadastrando o alimento na hora
curl -X POST localhost:8080/api/estoque/entradas -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"itens":[{"novoAlimento":{"nome":"Arroz","unidade":"kg"},"quantidade":50,"lote":"L001","validade":"2027-03-01"}]}'

# prato: quantidadePorKg = quanto do alimento vai em 1 kg do prato
curl -X POST localhost:8080/api/pratos -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nome":"Arroz branco","fichaTecnica":[{"alimentoId":1,"quantidadePorKg":0.4}],
       "receita":{"modoPreparo":"Refogar e cozinhar","tempoPreparoMinutos":30,"rendimentoPorcoes":10}}'

curl -X POST localhost:8080/api/cardapios -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"semanaInicio":"2026-11-16","itens":[{"pratoId":1,"dia":"2026-11-17","pesoKg":20}]}'
```

## Decisões de modelagem
- **Quantidades** ficam na unidade do alimento (padrão kg). `quantidadePorKg` na ficha técnica = quanto do alimento entra em 1 kg do prato; o consumo é `quantidadePorKg × pesoKg` do cardápio.
- **Baixa de estoque** segue o diagrama (subtrai, remove o insumo esgotado, passa ao próximo) usando PEPS: os lotes que vencem primeiro saem primeiro; lotes vencidos são ignorados. Se faltar estoque, nada é baixado.
- A validação do cardápio olha o estoque atual; ela não reserva insumos entre cardápios diferentes.
- Fuso horário fixo: America/Fortaleza.
