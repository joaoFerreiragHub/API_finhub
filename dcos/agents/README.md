# Documentacao dos Agentes FinHub

Cada pasta contem documentacao produzida pelo respectivo agente OpenClaw.
Os agentes devem escrever aqui os seus outputs, analises e recomendacoes.

## Estrutura

| Pasta | Agente | Modelo | Responsabilidade |
|-------|--------|--------|-----------------|
| `cto/` | finhub-cto | Sonnet 4.6 | Implementacao de codigo via Codex 5.3 |
| `financial-tools/` | finhub-financial-tools | Sonnet 4.6 | Logica financeira, calculos, modelos |
| `qa-release/` | finhub-qa-release | Haiku 4.5 | Testes, QA, validacao de releases |
| `data-quality/` | finhub-data-quality | Haiku 4.5 | Validacao de dados, anomalias, APIs |
| `legal-compliance/` | finhub-legal-compliance | Haiku 4.5 | GDPR, compliance, termos legais |
| `task-architect/` | finhub-task-architect | Haiku 4.5 | Specs tecnicas, decomposicao de tarefas |
| `product-release/` | finhub-product-release | Groq (gratis) | Backlog, priorizacao, roadmap |
| `growth-acquisition/` | finhub-growth-acquisition | Groq (gratis) | SEO, marketing, aquisicao |
| `knowledge-librarian/` | finhub-knowledge-librarian | Groq (gratis) | Documentacao, conhecimento, MEMORY |
| `content-platform/` | finhub-content-platform | Groq (gratis) | Conteudo editorial, creators |
| `directory-commerce/` | finhub-directory-commerce | Groq (gratis) | Directorio brokers, seguradoras |

## Convencoes

- Ficheiros em Markdown (.md)
- Nome do ficheiro: `YYYY-MM-DD_ASSUNTO.md` (ex: `2026-03-17_GDPR_AUDIT.md`)
- Cada documento deve ter: data, autor (agente), resumo, e recomendacoes accionaveis
