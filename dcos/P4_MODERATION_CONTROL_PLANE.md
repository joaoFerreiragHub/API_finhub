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

### 9. Controlos operacionais ao nivel do creator

Foi adicionada uma camada de controlo direto sobre creators sem suspender a conta inteira.

Objetivo:

- reduzir dano operacional mantendo acesso minimo a conta;
- travar criacao/publicacao enquanto a revisao decorre;
- permitir resposta graduada antes de `suspend` ou `ban`.

Estado guardado no utilizador:

- `creatorControls.creationBlocked`
- `creatorControls.creationBlockedReason`
- `creatorControls.publishingBlocked`
- `creatorControls.publishingBlockedReason`
- `creatorControls.cooldownUntil`
- `creatorControls.updatedAt`
- `creatorControls.updatedBy`

Endpoint admin:

- `POST /api/admin/users/:userId/creator-controls`

Payload base:

```json
{
  "action": "set_cooldown",
  "reason": "Spike de reports em observacao",
  "note": "barreira temporaria enquanto decorre revisao",
  "cooldownHours": 24
}
```

Acoes suportadas:

- `set_cooldown`
- `clear_cooldown`
- `block_creation`
- `unblock_creation`
- `block_publishing`
- `unblock_publishing`
- `suspend_creator_ops`
- `restore_creator_ops`

### 10. Enforcement nas rotas de conteudo

Foi adicionado middleware transversal nas rotas de creators para:

- `create` de `articles`, `videos`, `courses`, `books`, `liveevents`, `podcasts`
- `publish` dos mesmos tipos

Comportamento:

- `creationBlocked=true` => bloqueia criacao com `403`
- `cooldownUntil > now` => bloqueia criacao com `429` e `retryAfterSeconds`
- `publishingBlocked=true` => bloqueia publicacao com `403`
- admins passam sem estas barreiras operacionais

Isto garante que a camada de controlo do admin nao depende apenas do frontend.

### 11. Auditoria e historico

As alteracoes de creator controls entram agora em `UserModerationEvent` com acao:

- `creator_control`

Metadata registada:

- acao executada;
- cooldown aplicado, quando existe;
- snapshot `before` e `after` dos controlos.

Isto permite reconstruir quem travou o creator, quando e em que modo.

### 12. Alertas operacionais e metricas de risco

Foram enriquecidos os endpoints administrativos existentes:

- `GET /api/admin/metrics/overview`
- `GET /api/admin/alerts/internal`

Objetivo:

- dar visibilidade operacional imediata sobre reports;
- acompanhar o auto-hide preventivo;
- mostrar pressao e uso de `creator controls` sem depender de consulta manual a varios modulos.

#### 12.1. Metricas novas no overview

O bloco `moderation` passa a incluir:

- `reports.openTotal`
- `reports.highPriorityTargets`
- `reports.criticalTargets`
- `reports.topReasons`
- `reports.intake.last24h|last7d`
- `reports.resolved.last24h|last7d`

Tambem inclui:

- `automation.policyAutoHide.successLast24h|last7d`
- `automation.policyAutoHide.errorLast24h|last7d`

E ainda:

- `creatorControls.active.affectedCreators`
- `creatorControls.active.creationBlocked`
- `creatorControls.active.publishingBlocked`
- `creatorControls.active.cooldownActive`
- `creatorControls.active.fullyRestricted`
- `creatorControls.actions.last24h|last7d`
- `creatorControls.actions.byActionLast7d`

Isto transforma o overview num ponto unico para:

- medir backlog de risco;
- perceber se a policy automatica esta a agir ou a falhar;
- perceber quantos creators estao atualmente limitados.

#### 12.2. Alertas novos

O feed `GET /api/admin/alerts/internal` passa a incluir:

- `critical_report_target`
- `policy_auto_hide_triggered`
- `policy_auto_hide_failed`
- `creator_control_applied`

Regras desta iteracao:

- targets com reports abertos e prioridade `high` ou `critical` entram como alerta;
- eventos de `policy auto-hide` bem sucedidos e falhados entram como alerta;
- acoes restritivas sobre creators (`set_cooldown`, `block_creation`, `block_publishing`, `suspend_creator_ops`) entram como alerta.

Os thresholds devolvidos no endpoint passam a expor:

- `reportPriorityMin=high`
- `reportMinOpenReports=3`
- `creatorControlRestrictiveActions`

#### 12.3. Nota operacional

Esta camada nao substitui um dashboard visual dedicado. O objetivo aqui foi consolidar os sinais de risco no backend para que:

- o frontend admin tenha um contrato unico para leitura;
- futuras automacoes e scorecards usem os mesmos sinais;
- o P4 continue a crescer por composicao, nao por excecoes espalhadas.

### 13. Trust scoring e reincidencia por creator

Foi adicionada uma camada de sintese para creators:

- `trustSignals` na listagem `GET /api/admin/users`
- `trustSignals` por item em `GET /api/admin/content/queue` via `creatorTrustSignals`
- endpoint dedicado `GET /api/admin/users/:userId/trust-profile`
- distribuicao agregada em `GET /api/admin/metrics/overview`

Objetivo:

- deixar o frontend admin renderizar risco com boa UX sem recomputar regras no cliente;
- expor um score unico por creator;
- ligar reports, historico de moderacao e controlos operacionais numa vista coerente.

Campos devolvidos:

```json
{
  "trustSignals": {
    "trustScore": 42,
    "riskLevel": "high",
    "recommendedAction": "block_publishing",
    "generatedAt": "2026-02-28T00:00:00.000Z",
    "summary": {
      "openReports": 6,
      "highPriorityTargets": 2,
      "criticalTargets": 1,
      "hiddenItems": 1,
      "restrictedItems": 0,
      "recentModerationActions30d": 3,
      "repeatModerationTargets30d": 1,
      "recentCreatorControlActions30d": 1,
      "activeControlFlags": ["cooldown_active"]
    },
    "flags": ["critical_report_targets", "cooldown_active"],
    "reasons": [
      "1 alvo(s) com reports criticos.",
      "Cooldown operacional ativo."
    ]
  }
}
```

Heuristica atual:

- parte de `100` e retira pontos por reports, targets `high/critical`, itens ocultos/restritos, historico recente de moderacao, reincidencia e creator controls ativos;
- devolve `riskLevel` em `low|medium|high|critical`;
- devolve `recommendedAction` em:
  - `none`
  - `review`
  - `set_cooldown`
  - `block_publishing`
  - `suspend_creator_ops`

#### 13.1. Relevancia para UX

Esta camada foi desenhada para frontend admin.

O cliente nao deve:

- recalcular severidade a partir de campos crus;
- decidir cor/badge a partir de varias contagens soltas;
- tentar reconstruir a recomendacao operacional no browser.

O backend passa a entregar uma unidade de leitura pronta para:

- badges de risco em listas;
- cards de topo no dashboard;
- painel lateral de detalhe por creator;
- ordenacao e filtros visuais consistentes.

Isto e importante porque a UX aqui nao e decorativa. E uma superficie operacional para admins tomarem decisoes rapidas sob pressao.

### 14. Deteccao automatica para spam, links suspeitos, flood e criacao em massa

Foi adicionada uma camada transversal de deteccao automatica com persistencia por alvo.

Objetivo:

- apanhar sinais de risco antes de haver reports manuais suficientes;
- reduzir tempo ate triagem em conteudo e interacoes suspeitas;
- dar ao admin visibilidade consistente na queue, metricas e alertas.

Superficies avaliadas:

- `article`, `video`, `course`, `live`, `podcast`, `book`
- `comment`
- `review`

Momentos de avaliacao nesta iteracao:

- `create`
- `update`
- `publish` para conteudo base

Regras ativas:

- `spam`
- `suspicious_link`
- `flood`
- `mass_creation`

Heuristicas atuais:

- `spam`: repeticao de tokens/linhas, baixa diversidade lexical, URLs repetidas;
- `suspicious_link`: shorteners e hosts sensiveis, excesso de links externos;
- `flood`: demasiados itens na mesma superficie em janelas de `10m` e `60m`;
- `mass_creation`: demasiada criacao transversal nas superficies de conteudo base.

Estado persistido:

- modelo: `AutomatedModerationSignal`
- um sinal por `contentType + contentId`
- `status`: `active|reviewed|cleared`
- `severity`: `none|low|medium|high|critical`
- `recommendedAction`: `none|review|restrict|hide`
- `triggeredRules`, `textSignals`, `activitySignals`, `automation`

#### 14.1. Queue admin enriquecida

`GET /api/admin/content/queue` passa a devolver por item:

```json
{
  "automatedSignals": {
    "active": true,
    "status": "active",
    "score": 13,
    "severity": "critical",
    "recommendedAction": "hide",
    "triggerSource": "publish",
    "triggeredRules": [
      { "rule": "suspicious_link", "score": 8, "severity": "high" }
    ],
    "lastDetectedAt": "2026-02-28T00:00:00.000Z"
  }
}
```

Comportamento adicional:

- `flaggedOnly=true` inclui agora reports manuais e sinais automaticos;
- a ordenacao da queue passa a considerar o maior risco entre `reportSignals` e `automatedSignals`.

#### 14.2. Auto-hide opcional por env

O auto-hide desta camada fica desligado por defeito.

Flags introduzidas:

- `AUTOMATED_MODERATION_AUTO_HIDE_ENABLED`
- `AUTOMATED_MODERATION_AUTO_HIDE_ACTOR_ID`
- `AUTOMATED_MODERATION_AUTO_HIDE_MIN_SEVERITY`
- `AUTOMATED_MODERATION_AUTO_HIDE_ALLOWED_RULES`

Guardrails:

- so corre quando a recomendacao automatica e `hide`;
- exige actor tecnico admin valido;
- nao corre em drafts/archived;
- respeita threshold minimo de severidade e regras permitidas;
- regista auditoria tecnica em `admin.content.automated_detection_auto_hide`.

#### 14.3. Metricas e alertas

`GET /api/admin/metrics/overview` passa a incluir:

- `automation.automatedDetection.activeSignals`
- `automation.automatedDetection.highRiskTargets`
- `automation.automatedDetection.criticalTargets`
- `automation.automatedDetection.byRule`
- `automation.automatedDetection.autoHide.successLast24h|last7d`
- `automation.automatedDetection.autoHide.errorLast24h|last7d`

`GET /api/admin/alerts/internal` passa a incluir:

- `automated_detection_high_risk`
- `automated_detection_auto_hide_triggered`
- `automated_detection_auto_hide_failed`

Isto fecha o circuito minimo: detetar, priorizar, alertar, atuar opcionalmente e deixar pista de auditoria.

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

1. Historico de falso positivo e afinacao do trust score por creator.
2. Kill switches por superficie: home, landing, comments, reviews, creator page.
3. Ferramentas de rollback/review para reativacao segura apos hide em massa.
4. Jobs assincros para lotes maiores e workflows de aprovacao.
5. Escalonamento entre fila humana e auto-acao preventiva multi-nivel.
6. Dashboard visual com drill-down por creator, alvo, superficie e estado de automacao.
7. Afinar trust scoring com sinais automaticos e feedback de falso positivo.

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

1. workflows de revisao e rollback assistido;
2. dashboard visual com drill-down operacional;
3. afinacao do trust score com feedback de falso positivo;
4. kill switches por superficie.
