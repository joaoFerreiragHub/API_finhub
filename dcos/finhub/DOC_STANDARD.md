# FinHub — Standard de Documentação

> **Data:** 2026-03-23
> **Estado:** 📋 Referência permanente
> **Propósito:** Define o formato, estrutura e convenções para TODA a documentação em `dcos/finhub/`. Qualquer novo documento deve seguir este standard.

---

## 1. Princípios Base

1. **Português europeu** — todos os documentos em pt-PT. Excepções apenas em code blocks (inglês técnico).
2. **Uma fonte de verdade** — `dcos/finhub/` é o único lugar onde documentação activa vive.
3. **Três destinos possíveis:** `finhub/` (activo) → `done/` (concluído/arquivado) → `agents/` (output de agentes).
4. **Documentos vivos** — ao fechar uma fase, actualizar o estado no documento. Nunca deixar docs desactualizados no `finhub/`.
5. **Data sempre visível** — todo o documento tem data de última actualização no header.

---

## 2. Categorias de Documentos

| Categoria | Prefixo/Nome | Exemplos | Localização |
|-----------|-------------|----------|-------------|
| **Sistema** | `{NOME_SISTEMA}.md` | AUTH.md, PAYMENTS.md | `finhub/` |
| **Contexto & Planning** | `MASTER_CONTEXT`, `TASKS`, `ARCHITECTURE` | — | `finhub/` |
| **Execução** | `PROMPTS_EXECUCAO.md` | — | `finhub/` |
| **Runbook** | `RUNBOOK_{AREA}.md` | RUNBOOK_MODERATION.md | `finhub/` |
| **Standard/Referência** | `{NOME}_GUIDE`, `DOC_STANDARD` | SEED_GUIDE.md | `finhub/` |
| **Regras operacionais** | `regras.md`, `FINHUB_OPERATING_SYSTEM.md` | — | `finhub/` |
| **Arquivo** | Qualquer nome | docs de fases concluídas | `done/` |
| **Output de agente** | `{AGENTE}_{ASSUNTO}.md` | AUDITORIA_GDPR_2026.md | `agents/` |

---

## 3. Header Obrigatório

Todo o documento **começa com**:

```markdown
# FinHub — [Título do Documento]

> **Data:** YYYY-MM-DD
> **Estado:** [ver tabela abaixo]
> **Prioridade:** [🔴 Beta | 🟡 v1.0 | 🟢 Pós-v1.0 | 📋 Referência permanente]
> **Propósito:** [Uma frase descrevendo o propósito]
> **Ficheiros chave:** `path/ficheiro.ts`, `path/outro.ts`

---
```

### Valores de Estado

| Emoji | Valor | Significado |
|-------|-------|-------------|
| ✅ | Implementado | Totalmente implementado e testado |
| 🔨 | Em desenvolvimento | Trabalho em curso |
| ⏳ | Planeado | No backlog, não iniciado |
| 📋 | Referência | Documento de referência permanente (não tem "estado" de implementação) |
| ⚠️ | Parcial | Implementado mas incompleto |
| ❌ | Não existe | Por implementar |
| 🚫 | Descontinuado | Abordagem abandonada |

---

## 4. Estrutura de Secções por Tipo

### 4.1 Documento de Sistema (AUTH.md, PAYMENTS.md, etc.)

```markdown
## 1. Visão Geral
[2-4 parágrafos: o que é, porquê existe, quem usa]

## 2. Estado Actual
| Componente | Estado | Localização |
[tabela com o que existe hoje]

## 3. Arquitectura / Modelo de Dados
[diagramas ASCII, schemas, interfaces TypeScript]

## 4. Fluxos Principais
[fluxos passo a passo, com código onde relevante]

## 5. API / Endpoints
[tabela: método + rota + descrição + auth required]

## 6. Frontend — Componentes e Store
[componentes, hooks, store Zustand, React Query]

## 7. Roadmap — O que falta
| Funcionalidade | Estado | Prioridade | Notas |

## 8. Referências de Ficheiros
| Ficheiro | Propósito |
[tabela final com todos os ficheiros relevantes]
```

### 4.2 Documento de Planning (TASKS.md, ROADMAP.md)

```markdown
## 1. Estado Actual (resumo)

## 2. Release Map
[tabela: feature | estado | prompt | notas]

## 3. Backlog por prioridade
[🔴 Beta → 🟡 v1.0 → 🟢 Pós-v1.0]
```

### 4.3 Runbook

```markdown
## 1. Âmbito e Quando Usar

## 2. Pré-Requisitos

## 3. Procedimentos
### P1 — [Nome do Procedimento]
#### Passo 1
#### Passo 2
### P2 — ...

## 4. Rollback

## 5. Escalação
```

### 4.4 Documento de Contexto (MASTER_CONTEXT.md, ARCHITECTURE.md)

```markdown
## 1. Visão de Produto

## 2. Modelo Mental (diagrama ASCII)

## 3. Stack Técnica (tabelas)

## 4. Roles & Permissões

## 5. Estado de Desenvolvimento

## 6. Regras para Agentes
```

---

## 5. Convenções de Formatação

### Tabelas
- **Sempre usar tabelas** para listas de 3+ itens com múltiplos atributos
- Ordem das colunas: `| Componente/Feature | Estado | Localização/Notas |`
- Status com emoji: `✅ Activo`, `⏳ Por implementar`, `❌ Não existe`, `⚠️ Parcial`

### Blocos de Código
- Sempre especificar a linguagem: ` ```typescript `, ` ```bash `, ` ```json `
- Código real do projecto > pseudo-código
- Incluir o caminho do ficheiro num comentário quando relevante

### Links Internos
- Sempre referenciar outros docs por nome: `ver AUTH.md`, `ver TASKS.md`
- Nunca paths absolutos — apenas nomes de ficheiro

### Emojis de Prioridade
| Emoji | Prioridade | Contexto |
|-------|-----------|---------|
| 🔴 | Beta obrigatório | Bloqueia o beta se não feito |
| 🟡 | v1.0 | Necessário para full release |
| 🟢 | Pós-v1.0 | Iterativo, sem data fixa |
| 📋 | Referência | Não é uma task, é documentação |

### Status de Tasks em Tabelas
| Símbolo | Significado |
|---------|-------------|
| ✅ | Fechado/Implementado |
| ⏳ | Por iniciar |
| 🔄 | Em curso |
| ❌ | Bloqueado |

---

## 6. Regras de Naming de Ficheiros

| Tipo | Formato | Exemplos |
|------|---------|---------|
| Sistema | `NOME_UPPERCASE.md` | `AUTH.md`, `COMMUNITY.md` |
| Runbook | `RUNBOOK_AREA.md` | `RUNBOOK_MODERATION_CONTROL_PLANE.md` |
| Guia técnico | `NOME_GUIDE.md` | `SEED_GUIDE.md` |
| Planning | `NOME_UPPERCASE.md` | `TASKS.md`, `ROADMAP.md` |
| Standard | `DOC_STANDARD.md` | — |
| Log técnico | `{SUFIXO}_CATALOG.md` | `P6_LOG_EVENT_CATALOG.md` |

**Proibido:**
- Nomes com data no filename (usar header `> **Data:**`)
- Nomes com numeração tipo P5_, P6_ para novos docs (prefixo legacy de fases)
- Lowercase ou camelCase (usar UPPERCASE_WITH_UNDERSCORES)

---

## 7. Workflow de Criação de Documento

```
1. Verificar se já existe um doc para este assunto em finhub/
   → Se sim: actualizar em vez de criar novo
   → Se não: criar com o template correcto (secção 4)

2. Preencher o header obrigatório (secção 3)

3. Escrever as secções na ordem definida para o tipo (secção 4)

4. Adicionar tabela "Referências de Ficheiros" no final

5. Adicionar ao SYSTEMS_INDEX.md (se for novo sistema ou guide)

6. Adicionar ao MASTER_CONTEXT.md secção 11 (directório)

7. Commit com mensagem: "docs: add/update {nome} — {propósito em 1 linha}"
```

---

## 8. Workflow de Arquivamento

Quando uma tarefa/fase está concluída:

```
1. Actualizar o estado no documento de sistema (ex: AUTH.md)
   → Mudar ⏳ para ✅ nas tabelas relevantes

2. Se o documento era um planning doc de fase (ex: P5_FIRE_PORTFOLIO_SIMULATOR.md):
   → git mv dcos/finhub/{FICHEIRO} dcos/done/
   → Commit: "docs: archive {FICHEIRO} — {fase} completed"

3. Actualizar TASKS.md para marcar como ✅

4. Actualizar MASTER_CONTEXT.md se for uma fase de desenvolvimento
```

---

## 9. Checklist para Novo Documento

Antes de fazer commit de um novo documento, verificar:

```
[ ] Header obrigatório presente (Data, Estado, Prioridade, Propósito)
[ ] Todas as secções do template preenchidas
[ ] Nenhuma secção em branco (remover ou preencher)
[ ] Links para outros docs por nome de ficheiro
[ ] Tabela "Referências de Ficheiros" no final
[ ] Adicionado ao SYSTEMS_INDEX.md
[ ] Linguagem: português europeu (pt-PT)
[ ] Sem lorem ipsum / placeholder text
[ ] Code blocks têm linguagem especificada
```

---

## 10. Templates Rápidos

### Template: Documento de Sistema
```markdown
# FinHub — [Nome do Sistema]

> **Data:** 2026-MM-DD
> **Estado:** ⏳ Planeado
> **Prioridade:** 🟡 v1.0
> **Propósito:** [Uma frase]
> **Ficheiros chave:** `src/...`

---

## 1. Visão Geral
[Descrição]

## 2. Estado Actual
| Componente | Estado | Localização |
|-----------|--------|-------------|
| — | — | — |

## 3. Arquitectura
[Diagramas/schemas]

## 4. Fluxos Principais
[Passo a passo]

## 5. API / Endpoints
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| — | — | — | — |

## 6. Frontend
[Componentes, hooks, store]

## 7. Roadmap
| Funcionalidade | Estado | Prioridade |
|---------------|--------|-----------|
| — | ⏳ | 🟡 v1.0 |

## Referências de Ficheiros
| Ficheiro | Propósito |
|---------|-----------|
| — | — |
```

### Template: Runbook
```markdown
# FinHub — Runbook: [Nome do Procedimento]

> **Data:** 2026-MM-DD
> **Estado:** 📋 Referência permanente
> **Prioridade:** 📋 Referência
> **Propósito:** [Quando usar este runbook]
> **Audiência:** [Admin / CTO / Todos]

---

## 1. Âmbito
[O que cobre, quando aplicar]

## 2. Pré-Requisitos
- [ ] Acesso a [X]
- [ ] [Y] configurado

## 3. Procedimentos

### P1 — [Nome]
**Duração estimada:** Xh
**Impacto:** [Impacto no serviço]

#### Passo 1
```bash
# comando
```

#### Passo 2
[instruções]

## 4. Rollback
[Como desfazer]

## 5. Escalação
- **Primário:** [quem contactar]
- **Secundário:** [backup]
```
