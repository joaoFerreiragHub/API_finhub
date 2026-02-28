# P4 Moderation Control Plane

## Objetivo

Dar ao admin e aos gestores uma camada de controlo operacional sobre conteudo e criadores, com foco em:

- esconder conteudo indesejado rapidamente;
- aplicar moderacao em lote sem perder auditabilidade;
- suportar escala horizontal e vertical sem depender de acoes manuais dispersas;
- deixar o caminho preparado para automacao, deteccao e protecao preventiva da plataforma.

## Estado atual implementado

Data desta iteracao: 2026-02-27.

### 1. Fast hide operacional

Foi criado um trilho rapido para ocultacao imediata:

- endpoint: `POST /api/admin/content/:contentType/:contentId/hide-fast`
- escopo: `admin.content.moderate`
- comportamento: aplica `moderationStatus=hidden` usando o mesmo pipeline de auditoria do hide normal
- motivo: se o admin nao enviar `reason`, o backend usa `Ocultacao rapida preventiva para protecao da plataforma.`
- metadata do evento: `fastTrack: true`

Isto existe para reduzir friccao quando ha necessidade de retirar conteudo de circulacao antes de uma analise mais completa.

### 2. Moderacao em lote com guardrails

Foi criado o endpoint:

- `POST /api/admin/content/bulk-moderate`

Payload esperado:

```json
{
  "action": "hide",
  "reason": "Spam coordenado",
  "note": "batch inicial de contencao",
  "confirm": true,
  "items": [
    { "contentType": "article", "contentId": "..." },
    { "contentType": "comment", "contentId": "..." }
  ]
}
```

Guardrails implementados:

- maximo de `50` itens por lote;
- deduplicacao por `contentType + contentId`;
- `confirm=true` obrigatorio quando o lote final tem `10` ou mais itens unicos;
- resposta com sucesso/falha por item;
- o lote nao falha por inteiro quando um item individual falha;
- metadata do evento por item: `bulkModeration: true` e `bulkSize`.

Resposta operacional:

- `summary.requested`: itens recebidos no pedido;
- `summary.processed`: itens unicos realmente processados;
- `summary.succeeded`: itens moderados com sucesso;
- `summary.failed`: itens que falharam;
- `summary.changed`: itens cujo estado mudou;
- `guardrails.duplicatesSkipped`: duplicados ignorados.

### 3. Rate limits dedicados para moderacao

Foram criados dois limitadores dedicados:

- `adminModerationAction`: `30` acoes por minuto por admin autenticado;
- `adminModerationBulk`: `10` lotes por `10` minutos por admin autenticado.

Notas:

- a chave privilegia `req.user.id`; sem utilizador autenticado faz fallback para IP;
- hide, hide-fast, unhide e restrict usam o limitador de acao;
- bulk-moderate usa o limitador de lote.

### 4. Reports de users a alimentar a queue admin

Foi adicionada a camada inicial de reports/flags:

- endpoint publico autenticado: `POST /api/reports/content`
- alvo suportado: `article`, `video`, `course`, `live`, `podcast`, `book`, `comment`, `review`
- deduplicacao: um report por `user + alvo`
- protecao anti-abuso:
  - self-report bloqueado;
  - rate limit dedicado para reports;
  - reenvio reabre/substitui o report existente em vez de multiplicar ruido

Payload esperado:

```json
{
  "contentType": "comment",
  "contentId": "...",
  "reason": "spam",
  "note": "link repetido e suspeito"
}
```

Motivos suportados:

- `spam`
- `abuse`
- `misinformation`
- `sexual`
- `violence`
- `hate`
- `scam`
- `copyright`
- `other`

### 5. Queue admin priorizada por signals de reports

A queue `GET /api/admin/content/queue` passa agora a devolver `reportSignals` por item e a ordenar primeiro por risco/reporting pressure e depois por data.

Campo devolvido por item:

```json
{
  "reportSignals": {
    "openReports": 0,
    "uniqueReporters": 0,
    "latestReportAt": null,
    "topReasons": [],
    "priorityScore": 0,
    "priority": "none"
  }
}
```

Regras de prioridade atuais:

- o score combina numero de reports abertos, reporters unicos e o peso do motivo mais grave;
- `scam`, `sexual`, `violence` e `hate` puxam prioridade para cima mais depressa;
- bandas atuais: `none`, `low`, `medium`, `high`, `critical`.

Filtros novos na queue:

- `flaggedOnly=true`
- `minReportPriority=low|medium|high|critical`

### 6. Fecho de reports quando ha acao admin

Quando o admin executa `hide`, `hide-fast`, `restrict` ou `unhide`, os reports abertos desse alvo passam para `reviewed`.

Objetivo:

- evitar que a queue continue a promover casos que ja tiveram intervencao;
- manter rastreabilidade do que foi sinalizado e do que foi tratado.

Endpoint admin adicional:

- `GET /api/admin/content/:contentType/:contentId/reports`

Serve para consultar o historico de reports por alvo, incluindo reporter, status, revisao e acao aplicada.

### 7. Policy engine com thresholds e automacao controlada

Foi adicionada uma camada de policy por cima dos `reportSignals`.

Objetivo:

- transformar ruido de reports em recomendacao operacional;
- separar `review`, `restrict` e `hide` de forma consistente;
- permitir auto-hide preventivo sem ficar ligado por defeito.

Sinais devolvidos agora na queue admin:

```json
{
  "policySignals": {
    "recommendedAction": "hide",
    "escalation": "critical",
    "automationEligible": true,
    "automationEnabled": false,
    "automationBlockedReason": "auto_hide_disabled",
    "matchedReasons": ["scam"],
    "thresholds": {
      "autoHideMinPriority": "critical",
      "autoHideMinUniqueReporters": 3,
      "autoHideAllowedReasons": ["scam", "hate", "sexual", "violence"]
    }
  }
}
```

Heuristica atual:

- `critical` ou motivo de alto risco com reporters suficientes => recomendacao `hide`;
- `medium` => recomendacao `restrict`;
- `low` => recomendacao `review`.

Motivos de alto risco nesta fase:

- `scam`
- `hate`
- `sexual`
- `violence`

### 8. Auto-hide preventivo controlado por env

O auto-hide nao corre por defeito.

Flags introduzidas:

- `MODERATION_POLICY_AUTO_HIDE_ENABLED`
- `MODERATION_POLICY_AUTO_HIDE_ACTOR_ID`
- `MODERATION_POLICY_AUTO_HIDE_MIN_PRIORITY`
- `MODERATION_POLICY_AUTO_HIDE_MIN_UNIQUE_REPORTERS`
- `MODERATION_POLICY_AUTO_HIDE_ALLOWED_REASONS`

Comportamento:

- quando um novo report entra, o backend avalia a policy;
- se a policy recomendar `hide` e os thresholds de automacao forem cumpridos;
- e se existir um actor tecnico admin configurado;
- o backend faz `hide-fast` automatico e regista auditoria tecnica.

Segurancas:

- feature desligada por defeito;
- actor obrigatorio e validado como ObjectId;
- apenas motivos permitidos entram em auto-hide;
- thresholds minimos de prioridade e reporters unicos;
- o response do report devolve `policy.before`, `policy.after` e estado de `automation`.

## Porque esta abordagem

### Fast hide

O objetivo nao e decidir tudo no momento da acao. O objetivo e ganhar tempo operacional e proteger a superficie publica imediatamente.

### Bulk com falhas parciais

Em cenarios de escala, um lote all-or-nothing cria mais risco operacional do que ajuda. O admin precisa de saber o que entrou, o que falhou e o que ficou efetivamente escondido.

### Auditoria dupla

Cada operacao continua coberta por:

- auditoria administrativa de rota;
- `ContentModerationEvent` por item afetado.

Isto preserva rastreabilidade para suporte, revisao interna e analise posterior.

## Gaps que ainda faltam no P4

Estas sao as proximas camadas que fazem mais sentido:

1. Policy engine com reincidencia por creator e historico de falso positivo.
2. Deteccao automatica para spam, links suspeitos, flood e criacao em massa.
3. Acoes sobre criadores para alem do conteudo: cooldown, limitacao, suspensao, ban.
4. Kill switches por superficie: home, landing, comments, reviews, creator page.
5. Ferramentas de rollback/review para reativacao segura apos hide em massa.
6. Metricas e alertas operacionais dedicados a moderacao.
7. Jobs assincros para lotes maiores e workflows de aprovacao.
8. Escalonamento entre fila humana e auto-acao preventiva multi-nivel.

## Pre-release obrigatorio

Antes de producao, esta parte nao deve ficar como esta sem os pontos abaixo:

1. Trocar o rate limiter em memoria por Redis ou store partilhada.
2. Medir e alertar picos de `hide-fast`, `bulk-moderate` e falhas por item.
3. Garantir scopes minimos para admins e perfis read-only.
4. Definir SLA operacional para fast hide e revisao posterior.
5. Criar playbook de incidente para abuso, spam coordenado e conteudo sensivel.
6. Adicionar testes de carga aos endpoints de moderacao.
7. Garantir retention e consulta eficiente de auditoria e eventos.
8. Preparar dashboard com visibilidade global por creator, alvo e superficie.

## Proxima iteracao recomendada

Se continuarmos na mesma linha, a sequencia com melhor retorno e:

1. acoes por creator e trust levels;
2. alertas operacionais e dashboard de risco;
3. reincidencia e trust scoring;
4. deteccao automatica fora dos reports manuais.
