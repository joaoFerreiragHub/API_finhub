# S0A-017: Script de importacao JSON → MongoDB

## Contexto
Os agentes OpenClaw escrevem activity logs em JSON nos seus workspaces.
Precisamos de um script que importe esses ficheiros para a coleccao `agent_activity_logs` no MongoDB.
O schema ja existe em `src/models/AgentActivityLog.ts`.

## Ficheiro a criar
`src/scripts/importAgentLogs.ts`

## Codigo

```typescript
// src/scripts/importAgentLogs.ts
// Sprint 0A — S0A-017: Importa activity logs JSON dos workspaces para MongoDB
// Uso: npx ts-node src/scripts/importAgentLogs.ts [caminho-para-json]
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { AgentActivityLog } from '../models/AgentActivityLog'

// Caminho base dos workspaces OpenClaw
const WORKSPACES_BASE = 'C:\\Users\\User\\.openclaw\\workspaces'

// Conectar ao MongoDB usando a mesma config do projecto
async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/finhub'
  await mongoose.connect(mongoUri)
  console.log('Conectado ao MongoDB')
}

// Encontrar todos os ficheiros JSON em activity-logs/
function findActivityLogs(basePath: string): string[] {
  const files: string[] = []
  try {
    const workspaces = fs.readdirSync(basePath, { withFileTypes: true })
    for (const ws of workspaces) {
      if (!ws.isDirectory()) continue
      const logsDir = path.join(basePath, ws.name, 'activity-logs')
      if (!fs.existsSync(logsDir)) continue
      const jsonFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.json'))
      for (const jsonFile of jsonFiles) {
        files.push(path.join(logsDir, jsonFile))
      }
    }
  } catch (err) {
    console.error('Erro ao ler workspaces:', err)
  }
  return files
}

// Importar um ficheiro JSON para MongoDB
async function importFile(filePath: string): Promise<{ ok: boolean; skipped: boolean }> {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)

  // Verificar se ja foi importado (pelo taskId + agentId + startedAt)
  const existing = await AgentActivityLog.findOne({
    agentId: data.agentId,
    taskId: data.taskId,
    startedAt: new Date(data.startedAt),
  })

  if (existing) {
    return { ok: true, skipped: true }
  }

  await AgentActivityLog.create({
    agentId: data.agentId,
    taskId: data.taskId,
    action: data.action || 'other',
    status: data.status || 'success',
    startedAt: new Date(data.startedAt),
    completedAt: new Date(data.completedAt),
    durationMinutes: data.durationMinutes || 0,
    summary: data.summary || '',
    filesChanged: data.filesChanged || [],
    tokensUsed: data.tokensUsed || { input: 0, output: 0, cost: 0 },
    qualityGate: data.qualityGate || { passedQA: true, rejections: 0 },
    deviations: data.deviations || [],
    learnings: data.learnings,
    triggeredBy: data.triggeredBy || 'unknown',
    llmModel: data.llmModel || data.model || 'unknown',
  })

  return { ok: true, skipped: false }
}

// Main
async function main(): Promise<void> {
  await connectDB()

  // Se receber um path como argumento, importa so esse ficheiro
  const specificPath = process.argv[2]
  const files = specificPath ? [specificPath] : findActivityLogs(WORKSPACES_BASE)

  console.log(`Encontrados ${files.length} ficheiro(s) para importar`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const file of files) {
    try {
      const result = await importFile(file)
      if (result.skipped) {
        skipped++
        console.log(`  SKIP: ${path.basename(file)} (ja importado)`)
      } else {
        imported++
        console.log(`  OK: ${path.basename(file)}`)
      }
    } catch (err) {
      errors++
      console.error(`  ERRO: ${path.basename(file)} —`, err)
    }
  }

  console.log(`\nResultado: ${imported} importados, ${skipped} duplicados ignorados, ${errors} erros`)
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
```

## Validacao
```bash
npx tsc --noEmit
```

## Criterios de aceitacao
- [ ] Ficheiro criado em `src/scripts/importAgentLogs.ts`
- [ ] TypeScript compila sem erros
- [ ] Codigo comentado conforme regras

## Apos conclusao (OBRIGATORIO)
1. Actualizar STATUS.md — S0A-017 passa a DONE
2. Actualizar MEMORY.md do WhatsApp com o estado
3. Enviar mensagem no Telegram: "Tarefa S0A-017 concluida. Estado actualizado — podes consultar pelo WhatsApp."
