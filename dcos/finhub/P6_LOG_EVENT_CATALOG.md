# P6 - Catalogo Inicial de Eventos de Logging

Data: 2026-03-08  
Escopo: API runtime (`server`) e worker de jobs administrativos

## 1) Convencao

Formato recomendado de evento:

`<dominio>_<acao>_<sufixo>`

Sufixos base:

- `failed`
- `warn`
- `info`

Exemplos:

- `admin_content_controller_list_queue_failed`
- `auth_controller_login_failed`
- `news_service_provider_rss_failed`

## 2) Dominios principais ativos

- `admin_content_controller`
- `admin_user_controller`
- `admin_editorial_cms_controller`
- `admin_assisted_session_controller`
- `auth_assisted_session_controller`
- `admin_audit_controller`
- `admin_metrics_controller`
- `admin_operational_alerts_controller`
- `admin_surface_control_controller`
- `auth_controller`
- `admin_content_service`
- `news_service`

## 3) Eventos legacy (bridge de console)

Logs que ainda usam `console.*` passam a emitir eventos no formato:

`legacy_<source_domain>_<acao_normalizada>_<nivel>`

Exemplos:

- `legacy_controller_newscontroller_received_request_for_api_news_featured_log`
- `legacy_service_fmpnewsservice_fmp_getnews_failed_error`

Campos adicionais no payload:

- `eventSource=legacy_console`
- `sourceDomain`
- `sourceFile`
- `legacyMessage`

## 4) Monitorizacao operacional

Endpoint:

- `GET /api/platform/monitoring/logging`

Snapshot atual exposto:

- nivel configurado (`LOG_LEVEL`)
- estado do patch de console
- totais por nivel
- numero de eventos unicos
- top eventos
- dominios legacy com maior volume

## 5) Evolucao prevista

1. reduzir progressivamente volume de eventos `legacy_*` via migracao explicita em ficheiros restantes;
2. definir lista "golden signals" por dominio critico (auth, admin, pagamentos, upload);
3. ligar alertas por threshold em eventos `*_failed` recorrentes.
