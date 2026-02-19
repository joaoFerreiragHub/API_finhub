/**
 * Converte string em slug URL-friendly
 * Exemplo: "Meu Título Aqui!" -> "meu-titulo-aqui"
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Normalizar caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim()
    .replace(/\s+/g, '-') // Espaços -> hífens
    .replace(/[^\w\-]+/g, '') // Remover caracteres especiais
    .replace(/\-\-+/g, '-') // Múltiplos hífens -> único
    .replace(/^-+/, '') // Remover hífen do início
    .replace(/-+$/, '') // Remover hífen do fim
}

/**
 * Gera slug único adicionando sufixo numérico se necessário
 */
export const generateUniqueSlug = async (
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> => {
  let slug = baseSlug
  let counter = 1

  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}
