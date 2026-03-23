# 📰 RSS News Service - Setup Guide

## 🇵🇹 🇧🇷 Notícias em Português

O sistema agora suporta **feeds RSS em Português** de fontes brasileiras e portuguesas!

### ✅ Fontes Ativas

| Fonte | País | Feeds | Categorias |
|-------|------|-------|-----------|
| **InfoMoney** | 🇧🇷 Brasil | 3 feeds (Geral, Mercados, Investimentos) | market, general |
| **ECO** | 🇵🇹 Portugal | 2 feeds (Geral, Mercados) | economy, market |

### 📋 Feeds Configurados

**InfoMoney (Brasil):**
- Geral: `https://www.infomoney.com.br/feed/`
- Mercados: `https://www.infomoney.com.br/mercados/feed/`
- Investimentos: `https://www.infomoney.com.br/guias/investimentos/feed/`

**ECO (Portugal):**
- Geral: `https://eco.sapo.pt/feed/`
- Mercados: `https://eco.sapo.pt/category/mercados/feed/`

---

## 🚀 Instalação

### 1. Instalar Dependência

No diretório do backend (`API_finhub`):

```bash
npm install rss-parser
```

### 2. Verificar Instalação

Execute o servidor e verifique os logs:

```bash
npm run dev
```

Deves ver:
```
📰 RSS News Service initialized with 5 feeds
```

### 3. Testar Endpoint

```bash
curl http://localhost:5000/api/news?limit=10
```

Deves ver notícias de:
- FMP (inglês)
- InfoMoney (português BR)
- ECO (português PT)

---

## 🔧 Configuração Avançada

### Ativar/Desativar Feeds

Em `src/config/newsConfig.ts`:

```typescript
rss: {
  enabled: true, // true/false
  feeds: ['infomoney', 'eco'] // Escolher quais feeds usar
}
```

### Adicionar Novos Feeds

Em `src/services/external/rssNewsService.ts`, adiciona ao objeto `feeds`:

```typescript
'nome-do-feed': {
  name: 'Nome da Fonte',
  url: 'https://exemplo.com/feed/',
  language: 'pt' ou 'pt-BR',
  country: 'PT' ou 'BR',
  defaultCategory: 'market' // ou outra categoria
}
```

---

## 🎯 Funcionalidades

### ✅ Categorização Automática em Português

O serviço reconhece keywords em português e categoriza automaticamente:

- **Crypto**: bitcoin, ethereum, cripto, blockchain
- **Earnings**: resultados, balanço, lucro, receita
- **Economy**: economia, PIB, inflação, juros, Selic
- **Market**: bolsa, ações, Ibovespa, PSI20
- **Forex**: câmbio, dólar, euro, moeda

### ✅ Análise de Sentimento em Português

Reconhece palavras positivas e negativas:

**Positivas:** alta, subida, valorização, ganho, crescimento
**Negativas:** queda, baixa, perda, crise, desvalorização

### ✅ Extração de Tickers

**Brasil:** PETR4, VALE3, ITUB4, etc.
**Portugal:** EDP, GALP, BCP, NOS, etc.

### ✅ Deduplicação

Remove notícias duplicadas automaticamente

### ✅ Imagens

Extrai imagens de múltiplas fontes RSS (enclosure, media:content, etc.)

---

## 📊 Estatísticas

Por padrão, cada execução do RSS service:
- Busca de **2 feeds** (InfoMoney Geral + ECO Geral)
- Processa **~40 notícias**
- Deduplica e filtra para **~30 notícias únicas**
- Tempo de execução: **1-2 segundos**

---

## 🔍 Troubleshooting

### Problema: "rss-parser não encontrado"

**Solução:**
```bash
cd API_finhub
npm install rss-parser
npm run dev
```

### Problema: "No articles from RSS"

**Verificar:**
1. Internet está funcionando
2. Feeds não estão bloqueados (firewall/proxy)
3. Logs do backend para ver erros específicos

### Problema: Categorias erradas

**Ajustar keywords** em `rssNewsService.ts` na função `categorizeContent()`

---

## 🌐 Endpoints Afetados

O RSS está integrado no endpoint principal:

```
GET /api/news
GET /api/news?category=market
GET /api/news?search=bitcoin
```

Todas as notícias (FMP + RSS) vêm juntas, ordenadas por data.

---

## 📝 Notas Técnicas

- **Rate Limiting:** 1 segundo entre requests aos feeds
- **Cache:** Não implementado (RSS é sempre fresh)
- **Retry:** Falhas são ignoradas (outros feeds continuam)
- **Encoding:** UTF-8 (suporta acentuação PT/BR)

---

## 🎉 Resultado Final

Agora tens notícias em **3 idiomas**:
- 🇺🇸 Inglês (FMP, NewsAPI)
- 🇧🇷 Português BR (InfoMoney)
- 🇵🇹 Português PT (ECO)

**Mix de conteúdo:**
- Mercado americano (FMP)
- Ações brasileiras (InfoMoney)
- Economia portuguesa (ECO)
- Crypto global (todos)

Perfeito para um público lusófono! 🚀
