# 🌱 Guia de Seed - Popular Base de Dados

## Pré-requisitos

1. **MongoDB** deve estar a correr
2. **API** deve estar a correr em `http://localhost:5000`

## Como Popular a Base de Dados

### Método 1: HTTP Seed (Recomendado)

```bash
# 1. Inicia a API (terminal separado)
cd API_finhub
npx ts-node-dev --respawn --transpile-only src/server.ts

# 2. Quando a API estiver pronta, executa o seed
node seed-http.js
```

### Método 2: TypeScript Seed (Direto na BD)

```bash
# Se preferires popular diretamente sem a API
npx tsx src/scripts/seed.ts
```

## O que será criado?

### 👥 Users
- **1 Admin**: `admin@finhub.com` / `admin123`
- **3 Creators**:
  - `creator1@finhub.com` / `creator123` - Ricardo Santos (Trading)
  - `creator2@finhub.com` / `creator123` - Ana Costa (Crypto)
  - `creator3@finhub.com` / `creator123` - João Ferreira (Stocks)
- **2 Users normais**:
  - `user1@test.com` / `user123` - Maria Silva (Free)
  - `user2@test.com` / `user123` - Pedro Alves (Premium)

### 📝 Content
- 2-3 Artigos sobre investimento e trading
- 1-2 Vídeos educativos
- 1 Curso completo
- 1 Podcast

### 🏢 Brands
- XTB (Broker)
- Binance (Exchange)
- TradingView (Platform)

### 💬 Interações
- Ratings em conteúdos
- Comentários
- Follows entre users e creators
- Favoritos

## Troubleshooting

### API não responde
```bash
# Verifica se está a correr
curl http://localhost:5000/api

# Se não, inicia novamente
npx ts-node-dev --respawn --transpile-only src/server.ts
```

### MongoDB não conecta
```bash
# Verifica se MongoDB está a correr
# Windows:
net start MongoDB

# Ou inicia manualmente
mongod
```

### Erros de "User already exists"
Normal se executares o seed múltiplas vezes. Os users já existem na BD.

### Limpar BD e recomeçar
```javascript
// No MongoDB shell ou Compass:
use finhub
db.dropDatabase()

// Depois executa o seed novamente
```

## Após o Seed

Podes testar a API com qualquer cliente HTTP (Postman, Insomnia, curl):

```bash
# Login como creator
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator1@finhub.com","password":"creator123"}'

# O accessToken retornado pode ser usado para operações autenticadas
```

## Próximos Passos

1. ✅ Seed executado com sucesso
2. 🎨 Integrar frontend com API
3. 🧪 Testar fluxos end-to-end
4. 🚀 Build e deploy
