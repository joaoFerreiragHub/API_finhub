/**
 * Apaga todos os dados PostHog de um utilizador (RGPD Art. 17).
 * Silencia erros - nao bloqueia a eliminacao da conta.
 */
export async function deletePostHogPerson(distinctId: string): Promise<void> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID

  if (!apiKey || !projectId) return

  try {
    const url = `https://eu.posthog.com/api/projects/${projectId}/persons/?distinct_id=${encodeURIComponent(distinctId)}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok && response.status !== 404) {
      console.error(`[PostHog] Falha ao eliminar person ${distinctId}: ${response.status}`)
    }
  } catch (error) {
    console.error(`[PostHog] Erro ao eliminar person ${distinctId}:`, error)
  }
}
