import { Request, Response } from 'express'
import {
  fetchProfile,
  fetchScores,
  fetchPeers,
  fetchAlerts,
  fetchRadar,  fetchIndicadores,
  fetchRadarWithPeers
} from '../utils/stockFetchers'
function simplifyRating(rating: string): 'A' | 'B' | 'C' | 'D' | 'F' {
    const char = rating?.[0]?.toUpperCase() ?? 'C'
    return ['A', 'B', 'C', 'D', 'F'].includes(char) ? (char as any) : 'C'
  }
  
export const getQuickAnalysis = async (req: Request, res: Response) => {
  
  const symbol = String(req.params.symbol ?? "")
  console.log(`🎯 getQuickAnalysis chamado com símbolo: "${symbol}"`)
  try {
    const [
        profile,
        scores,
        alerts,
        radarWithPeers,
        indicadores,
        { peers, quotes }
      ] = await Promise.all([
        fetchProfile(symbol),
        fetchScores(symbol),
        fetchAlerts(symbol),
        fetchRadarWithPeers(symbol), // 👈 aqui
        fetchIndicadores(symbol),
        fetchPeers(symbol)
      ])
      
      const quickAnalysis = {
        ...profile,
        qualityScore: scores.financialScores?.piotroskiScore ?? 0,
        growthScore: (scores.rating?.ratingDetailsDCFScore ?? 3) * 2,
        valuationGrade: simplifyRating(scores.rating?.rating || 'C'),
        valuationRawGrade: scores.rating?.rating || 'C+',
        riskScore: Math.min(scores.financialScores?.altmanZScore ?? 5, 10),
        piotroskiScore: scores.financialScores?.piotroskiScore ?? null,
        altmanZScore: scores.financialScores?.altmanZScore ?? null,
        alerts,
        radarData: radarWithPeers.main.radar, // 👈 radar da empresa principal
        radarPeers: radarWithPeers.peers,     // 👈 lista de peers com radar
        indicadores,
        peers,
        peersQuotes: quotes
      }
    res.json(quickAnalysis)
  } catch (error) {
    console.error('Erro ao gerar análise rápida:', error)
    res.status(500).json({ error: 'Erro ao gerar análise rápida' })
  }
}
