// src/utils/financial/epsCalculator.ts - VERSÃO FINAL CORRIGIDA

import { EPSCalculations } from './types'
import { calculateCAGR } from './helpers'

/**
 * 🔧 VERSÃO FINAL: Calcula métricas relacionadas ao EPS (Earnings Per Share) e CAGR
 */
export function calculateEPSMetrics(
  earningsCalendar: any[], 
  income: any, 
  historicalRatios: any[]
): EPSCalculations {
  console.log('📊 [FINAL] Calculando métricas de EPS...')
  
  // 🔧 CORREÇÃO PRINCIPAL: Garantir que os dados de EPS sejam extraídos corretamente
  
  // 1. EPS atual - múltiplas fontes com fallbacks
  const epsAtual = income?.eps ?? 
                   income?.epsdiluted ?? 
                   income?.epsbasic ??
                   earningsCalendar?.[0]?.eps ?? 
                   earningsCalendar?.[0]?.epsActual ?? 
                   null

  // 2. EPS ano anterior - dados estruturados do income statement
  const epsAnoAnterior = income?.epsY1 ?? 
                         historicalRatios?.[1]?.eps ?? 
                         historicalRatios?.[0]?.eps ?? // fallback se [1] não existir
                         null

  // 3. EPS de 2 anos atrás para CAGR Y-1
  const epsAno2Atras = income?.epsY2 ?? 
                       historicalRatios?.[2]?.eps ?? 
                       null

  console.log('💰 EPS extraído:', {
    atual: epsAtual,
    anoAnterior: epsAnoAnterior,
    ano2Atras: epsAno2Atras
  })

  // 🔧 CRÍTICO: Debug detalhado antes do cálculo CAGR
  console.log('🔍 [CRÍTICO] Validação antes do CAGR EPS:')
  console.log(`   epsAtual != null: ${epsAtual != null}`)
  console.log(`   epsAnoAnterior != null: ${epsAnoAnterior != null}`)
  console.log(`   !isNaN(epsAtual): ${!isNaN(epsAtual)}`)
  console.log(`   !isNaN(epsAnoAnterior): ${!isNaN(epsAnoAnterior)}`)
  console.log(`   epsAnoAnterior !== 0: ${epsAnoAnterior !== 0}`)
  console.log(`   Vai calcular CAGR: ${epsAtual != null && epsAnoAnterior != null && !isNaN(epsAtual) && !isNaN(epsAnoAnterior) && epsAnoAnterior !== 0}`)

  // 🔧 CÁLCULO CAGR EPS ATUAL - com validação rigorosa
  let cagrEps = null
  
  if (epsAtual != null && epsAnoAnterior != null && 
      !isNaN(epsAtual) && !isNaN(epsAnoAnterior) && 
      epsAnoAnterior !== 0) {
    
    cagrEps = calculateCAGR(epsAnoAnterior, epsAtual, 1)
    console.log(`📈 [CRÍTICO] CAGR EPS calculado: ${epsAnoAnterior} → ${epsAtual} = ${cagrEps}`)
    
    if (cagrEps === null) {
      console.log('🚨 [CRÍTICO] calculateCAGR retornou null - PROBLEMA NA FUNÇÃO HELPER!')
      // Fazer cálculo manual para debug
      const manualCAGR = ((epsAtual / epsAnoAnterior) - 1)
      console.log('🔧 [CRÍTICO] Cálculo manual:', manualCAGR)
    } else {
      console.log('✅ [CRÍTICO] CAGR EPS calculado com sucesso:', cagrEps)
    }
  } else {
    console.log('⚠️ CAGR EPS não calculado:', {
      epsAtualValido: epsAtual != null && !isNaN(epsAtual),
      epsAnteriorValido: epsAnoAnterior != null && !isNaN(epsAnoAnterior) && epsAnoAnterior !== 0,
      dadosDisponiveis: { epsAtual, epsAnoAnterior }
    })
  }

  // 🔧 CÁLCULO CAGR EPS (Y-1) - com validação rigorosa
  let cagrEpsAnoAnterior = null
  
  if (epsAnoAnterior != null && epsAno2Atras != null && 
      !isNaN(epsAnoAnterior) && !isNaN(epsAno2Atras) && 
      epsAno2Atras !== 0) {
    
    cagrEpsAnoAnterior = calculateCAGR(epsAno2Atras, epsAnoAnterior, 1)
    console.log(`📈 CAGR EPS (Y-1): ${epsAno2Atras} → ${epsAnoAnterior} = ${cagrEpsAnoAnterior}`)
  } else {
    console.log('⚠️ CAGR EPS (Y-1) não calculado: dados insuficientes')
  }

  // 🔧 FALLBACK usando earnings calendar se dados estruturados falharem
  if (cagrEps === null && earningsCalendar?.length >= 4) {
    console.log('🔄 Tentando fallback com earnings calendar...')
    
    const validEarnings = earningsCalendar
      .filter((earning: any) => {
        const eps = earning.eps ?? earning.epsActual
        return eps != null && !isNaN(eps) && eps !== 0
      })
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (validEarnings.length >= 4) {
      const epsRecente = validEarnings[0]?.eps ?? validEarnings[0]?.epsActual
      const eps4TrimestreAtras = validEarnings[3]?.eps ?? validEarnings[3]?.epsActual
      
      if (epsRecente != null && eps4TrimestreAtras != null && eps4TrimestreAtras !== 0) {
        cagrEps = calculateCAGR(eps4TrimestreAtras, epsRecente, 1)
        console.log(`📈 CAGR EPS (fallback): ${eps4TrimestreAtras} → ${epsRecente} = ${cagrEps}`)
      }
    }
  }

  // 🔧 RESULTADO FINAL com debug info
  const resultado = {
    epsAtual,
    cagrEps,
    cagrEpsAnoAnterior,
    // Debug info para troubleshooting
    _debug: {
      epsAnoAnterior,
      epsAno2Atras,
      earningsCalendarCount: earningsCalendar?.length ?? 0,
      historicalRatiosCount: historicalRatios?.length ?? 0,
      cagrEpsCalculado: cagrEps != null,
      cagrEpsY1Calculado: cagrEpsAnoAnterior != null,
      fonteDados: {
        epsAtual: epsAtual === income?.eps ? 'income.eps' : 
                  epsAtual === income?.epsdiluted ? 'income.epsdiluted' : 
                  epsAtual === earningsCalendar?.[0]?.eps ? 'earningsCalendar[0].eps' : 'outro',
        epsAnoAnterior: epsAnoAnterior === income?.epsY1 ? 'income.epsY1' : 
                        epsAnoAnterior === historicalRatios?.[1]?.eps ? 'historicalRatios[1].eps' : 'outro'
      }
    }
  }

  console.log('✅ [FINAL] Métricas de EPS calculadas:', resultado)
  console.log('🔍 Debug info:', resultado._debug)

  return resultado
}

/**
 * 🛠️ FUNÇÃO AUXILIAR: Validar e corrigir dados de entrada
 */
export function validateAndFixEPSData(income: any, historicalRatios: any[]) {
  console.log('🔍 Validando dados de EPS...')
  
  // Garantir que income.epsY1 e income.epsY2 existam
  const fixedIncome = {
    ...income,
    epsY1: income?.epsY1 ?? historicalRatios?.[1]?.eps ?? null,
    epsY2: income?.epsY2 ?? historicalRatios?.[2]?.eps ?? null
  }
  
  // Log para debug
  console.log('📊 Dados EPS após validação:', {
    eps: fixedIncome.eps,
    epsY1: fixedIncome.epsY1,
    epsY2: fixedIncome.epsY2,
    fonte: {
      epsY1: income?.epsY1 ? 'income' : 'historicalRatios',
      epsY2: income?.epsY2 ? 'income' : 'historicalRatios'
    }
  })
  
  return fixedIncome
}

/**
 * 🧪 FUNÇÃO DE TESTE: Verificar se os cálculos estão corretos
 */
export function testEPSCalculations() {
  console.log('🧪 Testando cálculos de EPS...')
  
  // Dados de teste da Realty Income
  const testIncome = {
    eps: 1.06,
    epsY1: 1.26,
    epsY2: 1.19 // Exemplo
  }
  
  const testHistoricalRatios = [
    { eps: 1.06 }, // atual
    { eps: 1.26 }, // Y-1
    { eps: 1.19 }  // Y-2
  ]
  
  const resultado = calculateEPSMetrics([], testIncome, testHistoricalRatios)
  
  console.log('🎯 RESULTADO DO TESTE:')
  console.log('   EPS atual:', resultado.epsAtual)
  console.log('   CAGR EPS:', resultado.cagrEps ? (resultado.cagrEps * 100).toFixed(2) + '%' : 'N/A')
  console.log('   CAGR EPS (Y-1):', resultado.cagrEpsAnoAnterior ? (resultado.cagrEpsAnoAnterior * 100).toFixed(2) + '%' : 'N/A')
  
  // Verificar se os resultados fazem sentido
  const esperadoCAGR = ((1.06 / 1.26) - 1) * 100 // -15.87%
  const calculadoCAGR = resultado.cagrEps ? resultado.cagrEps * 100 : null
  
  console.log('📊 VALIDAÇÃO:')
  console.log('   CAGR esperado:', esperadoCAGR.toFixed(2) + '%')
  console.log('   CAGR calculado:', calculadoCAGR ? calculadoCAGR.toFixed(2) + '%' : 'N/A')
  console.log('   Status:', Math.abs(esperadoCAGR - (calculadoCAGR ?? 0)) < 0.01 ? '✅ CORRETO' : '❌ INCORRETO')
  
  return resultado
}