# Possíveis problemas da arquitetura Spring Boot + FastAPI (OCR)

Análise dos riscos do desenho em que o Spring Boot é a única porta de entrada do site e chama o FastAPI (EasyOCR) por trás.

```
[Site] ──> [Spring Boot] ──multipart──> [FastAPI + EasyOCR]
               │  ▲                          │
               │  └───── JSON (insumos, alertas) ──┘
               ▼
          [PostgreSQL]
```

A arquitetura é razoável, mas tem custos reais. Os principais problemas, do mais provável ao menos provável:

## 1. Latência e bloqueio no upload

O OCR em imagem grande ou PDF de várias páginas pode levar de vários segundos a dezenas de segundos. Com a chamada síncrona, a requisição do site fica pendurada esperando o Spring, que espera o FastAPI. Os riscos são:

- Timeout no navegador, no proxy (nginx) ou no cliente HTTP do Spring. Basta um deles ser menor que o tempo do OCR.
- Threads do Spring ocupadas esperando. Com poucos usuários não pesa, mas com muitos uploads simultâneos esgota o pool.
- Usuário que fecha a aba e perde o processamento sem saber.

**Mitigação:** tornar o fluxo assíncrono. O Spring recebe o arquivo, devolve um `id` de processamento (202 Accepted) e o site consulta o status por polling (ou WebSocket/SSE). É mais trabalho, mas é a solução padrão para tarefas lentas.

## 2. O OCR é o gargalo de capacidade

O EasyOCR consome muita CPU/RAM e, com GPU, memória de vídeo. Cada requisição concorrente disputa esses recursos. Se vierem vários uploads ao mesmo tempo, a latência dispara ou o processo pode ser encerrado por falta de memória.

**Mitigação:** limitar a concorrência no FastAPI (um semáforo ou uma fila), limitar tamanho e número de páginas por arquivo, e usar uma fila de tarefas (Celery, RabbitMQ, Redis) se o volume crescer. Escalar horizontalmente também é mais pesado, porque cada réplica carrega os modelos na memória.

## 3. Ponto único de falha e falhas parciais

Com dois serviços, há novos jeitos de dar errado, e o sistema precisa decidir o que fazer em cada um:

- O FastAPI cai ou está reiniciando (os modelos levam tempo para carregar na subida).
- O OCR termina, mas o Spring falha ao gravar os alertas no banco.
- O Spring envia o arquivo, a rede cai e ele reenvia (processamento duplicado).

**Mitigação:** health check no FastAPI, retry com limite no Spring, e uma resposta clara ao usuário ("serviço de leitura indisponível, tente novamente") em vez de erro genérico. Registre em `logs_leitura` também as falhas de comunicação, não só as de OCR.

## 4. Contrato duplicado entre duas linguagens

O JSON do `ResponseExtracao` existe como `BaseModel` em Python e como `record` em Java. Se alguém adicionar ou renomear um campo de um lado, o outro quebra, e o erro pode aparecer só em produção (campo `null` silencioso).

**Mitigação:** gerar as duas pontas a partir de uma fonte única. O FastAPI já expõe o OpenAPI em `/openapi.json`, e dá para gerar o cliente Java a partir dele (OpenAPI Generator). Mesmo sem gerar, teste de contrato automatizado ajuda. Versione o endpoint (`/v1/document_extraction/`) para mudanças que quebram compatibilidade.

## 5. O arquivo é enviado duas vezes

O site envia ao Spring, que reenvia ao FastAPI. Para arquivos grandes, isso dobra o tráfego e a memória usada (o `file.getBytes()` carrega o arquivo inteiro na RAM do Spring).

**Mitigação:** fazer streaming em vez de carregar tudo em memória, ou salvar o arquivo num armazenamento compartilhado (disco/S3/MinIO) e passar só a referência ao FastAPI. A segunda opção também resolve um problema que o desenho atual não resolve: guardar o documento original para auditoria.

## 6. Dois serviços para operar

Dois runtimes (JVM e Python com PyTorch), duas imagens Docker (a do EasyOCR/torch é grande, de alguns GB), dois conjuntos de logs, dois deploys, dois pontos de monitoramento. Os logs de uma mesma operação ficam separados, e investigar "por que esse documento falhou" exige cruzar os dois.

**Mitigação:** propagar um `correlation id` (header que o Spring gera e o FastAPI repete em cada linha de log) e concentrar os logs num lugar só. Sem isso, a promessa de "consultar no log da aplicação" fica difícil de cumprir.

## 7. Segurança entre serviços

Ao tirar a autenticação do FastAPI, ele passa a confiar em qualquer um que consiga alcançá-lo. Se a porta ficar exposta por engano (comum em `docker-compose` com `ports:`), qualquer pessoa pode usar o OCR sem login, e uploads maliciosos (PDF malformado, "zip bomb", arquivos enormes) chegam direto no parser.

**Mitigação:** não publicar a porta do FastAPI fora da rede interna, validar tamanho/tipo também no FastAPI (a validação do Spring não o protege se alguém o acessar direto), e considerar um token compartilhado entre os dois serviços.

## 8. Regras de negócio espalhadas

Mesmo com a divisão limpa, o `revisar`, o `CONF_MIN` e as regex são regras de negócio do lado Python, enquanto validade e quantidade válidas ficam no Java. Com o tempo, regras parecidas tendem a aparecer nos dois lados, e é difícil saber onde corrigir um bug.

**Mitigação:** definir cedo o critério: o FastAPI só *extrai e sinaliza incerteza*, e o Spring *decide o que é válido para o estoque*. Documente isso.

## Vale a pena?

Depende do tamanho do projeto. Se você é a única pessoa desenvolvendo, o volume é baixo e a equipe já domina Python, **uma API única em FastAPI com tudo** tem bem menos pontos de falha, e você pode separar depois, porque a modularização `routers/services` já permite isso. A arquitetura com Spring compensa se houver motivo concreto: equipe Java, integração com sistemas corporativos, ou exigência da empresa/disciplina.

Se for seguir com os dois, os três itens a fazer primeiro são:

1. O fluxo assíncrono (problema 1).
2. A porta do FastAPI só na rede interna (problema 7).
3. O `correlation id` nos logs (problema 6).
