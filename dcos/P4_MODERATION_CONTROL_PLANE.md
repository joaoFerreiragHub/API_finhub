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
  "note": "batch inicial de contenção",
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

1. Pipeline de reports/flags de users para alimentar a queue de moderacao.
2. Policy engine com regras por severidade, reincidencia e tipo de alvo.
3. Deteccao automatica para spam, links suspeitos, flood e criacao em massa.
4. Acoes sobre criadores para alem do conteudo: cooldown, limitacao, suspensao, ban.
5. Kill switches por superficie: home, landing, comments, reviews, creator page.
6. Ferramentas de rollback/review para reativacao segura apos hide em massa.
7. Metricas e alertas operacionais dedicados a moderacao.
8. Jobs assincros para lotes maiores e workflows de aprovacao.

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

1. reports/flags dos users;
2. queue de moderacao priorizada por risco;
3. policy engine simples com thresholds;
4. automacao de hide preventivo + revisao humana.
