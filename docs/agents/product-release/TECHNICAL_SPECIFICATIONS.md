# FinHub API - Especificações Técnicas (4 Semanas)

**Data**: 17 Mar 2026 | **Versão**: 1.0

---

## 📐 Arquitetura de Implementação

### Stack Atual
```
┌─────────────────────────────────────────────┐
│         Frontend (Not Covered)               │
└──────────────────┬──────────────────────────┘
                   │
┌─────────────────▼──────────────────────────┐
│    Express.js + TypeScript + Mongoose       │
│           API Gateway Layer                 │
└──────────┬──────────────────┬───────────────┘
           │                  │
    ┌──────▼──────┐    ┌──────▼──────┐
    │  MongoDB    │    │  Redis      │
    │ (Persistence)   │ (Cache/Queue)│
    └─────────────┘    └─────────────┘
           │                  │
    ┌──────▼──────────────────▼──────┐
    │   External APIs                 │
    │ • Yahoo Finance                 │
    │ • RSS Feeds                     │
    │ • Sentry                        │
    └─────────────────────────────────┘
```

---

## 🛠️ Semana 1: Enhanced Stock Analysis API

### 1.1 New Endpoints

#### GET /api/stock/{symbol}/analysis/advanced
```typescript
Request:
{
  "symbol": "AAPL",
  "period": "1y",
  "indicators": ["rsi", "macd", "bb"],
  "includeVolatility": true
}

Response:
{
  "symbol": "AAPL",
  "currentPrice": 182.50,
  "technicalIndicators": {
    "rsi": { "value": 65, "signal": "overbought" },
    "macd": { "value": 3.45, "signal": "bullish_divergence" },
    "bollingerBands": {
      "upper": 185.20,
      "middle": 180.00,
      "lower": 174.80
    }
  },
  "volatility": {
    "iv": 0.23,
    "vix": 18.5,
    "betaToMarket": 1.18
  },
  "timestamp": "2026-03-17T10:30:00Z"
}
```

#### POST /api/news/analyze-sentiment
```typescript
Request:
{
  "articleIds": ["news_001", "news_002"],
  "returnFullAnalysis": true
}

Response:
{
  "articles": [
    {
      "id": "news_001",
      "sentiment": "positive",
      "score": 0.87,
      "keywords": ["earnings", "growth"],
      "relevanceScore": 0.95
    }
  ],
  "aggregatedSentiment": "positive",
  "trendDirection": "bullish"
}
```

### 1.2 Database Changes

#### Stock Model Enhancement
```typescript
// src/models/Stock.ts - New Fields
interface StockDocument extends Document {
  symbol: string;
  currentPrice: number;
  // NEW
  technicalIndicators: {
    rsi: number;
    macd: number;
    bb_upper: number;
    bb_middle: number;
    bb_lower: number;
    lastUpdated: Date;
  };
  volatilityMetrics: {
    iv: number; // Implied Volatility
    vix: number; // VIX-like metric
    beta: number;
  };
  priceHistory: {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}
```

#### News Model Enhancement
```typescript
// src/models/News.ts - New Fields
interface NewsDocument extends Document {
  title: string;
  content: string;
  source: string;
  // NEW
  sentiment: {
    label: "positive" | "negative" | "neutral";
    score: number; // 0-1
    confidence: number;
  };
  technicalKeywords: string[];
  relatedAssets: {
    symbol: string;
    relevance: number;
  }[];
  processedAt: Date;
}
```

### 1.3 Services Implementation

#### stockAnalysisService.ts (NEW)
```typescript
export class StockAnalysisService {
  async getAdvancedAnalysis(symbol: string, period: string): Promise<AdvancedAnalysisDTO> {
    // 1. Buscar dados históricos do cache/DB
    // 2. Calcular indicadores técnicos (talib-like)
    // 3. Buscar volatilidade de APIs externas
    // 4. Agregar e retornar dados
  }

  async calculateRSI(prices: number[], period: 14): Promise<number> { }
  async calculateMACD(prices: number[]): Promise<MACDData> { }
  async calculateBollingerBands(prices: number[]): Promise<BBData> { }
}
```

#### sentimentAnalysisService.ts (NEW)
```typescript
export class SentimentAnalysisService {
  async analyzeArticleSentiment(content: string): Promise<SentimentResult> {
    // Usar NLP ou terceiros (ex: Azure Text Analytics)
  }

  async extractFinancialKeywords(content: string): Promise<string[]> { }
  
  async correlateWithAssets(sentiment: SentimentResult): Promise<RelatedAssets[]> { }
}
```

### 1.4 Migrations & Indexes

```typescript
// db-migration-2026-03-17.ts
db.Stock.updateMany({}, {
  $set: {
    technicalIndicators: {
      rsi: 0,
      macd: 0,
      lastUpdated: new Date()
    },
    volatilityMetrics: {
      iv: 0,
      vix: 0,
      beta: 0
    }
  }
});

// Criar índices para performance
db.Stock.createIndex({ "symbol": 1, "technicalIndicators.lastUpdated": -1 });
db.News.createIndex({ "sentiment.label": 1, "publishedAt": -1 });
```

---

## 🛠️ Semana 2: Authentication & Security

### 2.1 MFA Implementation

#### User Model Extension
```typescript
// src/models/User.ts - MFA Fields
interface UserDocument extends Document {
  // Existing
  email: string;
  password: string;
  
  // MFA NEW FIELDS
  mfaEnabled: boolean;
  mfaSecret: string; // Encryptado (TOTP secret)
  mfaBackupCodes: {
    code: string;
    used: boolean;
    createdAt: Date;
  }[];
  mfaMethod: "totp" | "sms" | "email";
  lastMFAVerification: Date;
}
```

#### MFA Service
```typescript
// src/services/mfa.service.ts (NEW)
export class MFAService {
  async generateTOTPSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
    // Usar speakeasy ou similar
  }

  async verifyTOTPCode(userId: string, code: string): Promise<boolean> { }
  
  async generateBackupCodes(userId: string): Promise<string[]> { }
  
  async validateBackupCode(userId: string, code: string): Promise<boolean> { }
}
```

#### Authentication Flow
```typescript
// POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Response (Step 1)
{
  "status": "mfa_required",
  "mfaChallenge": "totp",
  "tempToken": "jwt_temp_token"
}

// POST /api/auth/verify-mfa
{
  "tempToken": "jwt_temp_token",
  "mfaCode": "123456"
}

// Response (Step 2)
{
  "status": "authenticated",
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "expiresIn": 3600
}
```

### 2.2 Token Management

#### Token Rotation Middleware
```typescript
// src/middlewares/tokenRotation.ts
export async function tokenRotationMiddleware(req, res, next) {
  // 1. Verificar se token está próximo de expirar
  // 2. Se sim, gerar novo token automaticamente
  // 3. Adicionar novo token ao response header
  // 4. Revogar token antigo em Redis
}
```

#### Token Blacklist (Redis)
```typescript
// Redis key structure: "blacklist:jwt:{tokenHash}"
// TTL: tempo de expiração original do token

async function revokeToken(token: string): Promise<void> {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await redis.setex(`blacklist:jwt:${hash}`, ttlInSeconds, '1');
}

async function isTokenRevoked(token: string): Promise<boolean> {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const exists = await redis.exists(`blacklist:jwt:${hash}`);
  return exists === 1;
}
```

### 2.3 Rate Limiting Granular

```typescript
// src/middlewares/advancedRateLimiter.ts
const rateLimitConfig = {
  default: { windowMs: 15 * 60 * 1000, max: 100 },
  authentication: { windowMs: 15 * 60 * 1000, max: 5 },
  highRisk: { windowMs: 1 * 60 * 1000, max: 10 },
  apiAccess: { windowMs: 1 * 60 * 1000, max: 1000 },
};

export class AdaptiveRateLimiter {
  async checkLimit(userId: string, endpoint: string): Promise<{ 
    allowed: boolean; 
    remaining: number; 
  }> {
    // Verificar histórico de comportamento do usuário
    // Ajustar limites dinamicamente
  }
}
```

---

## 🛠️ Semana 3: Portfolio Advanced Features

### 3.1 Portfolio Risk Analysis

```typescript
// src/services/portfolioRiskAnalysis.service.ts (NEW)
export class PortfolioRiskAnalysisService {
  async calculateSharpeRatio(portfolio: Portfolio, riskFreeRate: number): Promise<number> {
    // Sharpe = (portfolioReturn - riskFreeRate) / portfolioStdDev
  }

  async calculateBeta(portfolio: Portfolio): Promise<number> {
    // Beta = Cov(Portfolio, Market) / Var(Market)
  }

  async calculateVaR(portfolio: Portfolio, confidence: number = 0.95): Promise<number> {
    // Value at Risk calculation
  }

  async calculateCorrelationMatrix(holdings: Holding[]): Promise<number[][]> { }
  
  async suggestRebalancing(portfolio: Portfolio): Promise<RebalancingAdvice> { }
}
```

### 3.2 Watchlist Model

```typescript
// src/models/Watchlist.ts (NEW)
interface WatchlistDocument extends Document {
  userId: ObjectId;
  name: string;
  description: string;
  assets: {
    symbol: string;
    addedAt: Date;
    priceAtAdd: number;
    currentPrice: number;
    performancePercent: number;
  }[];
  alerts: {
    id: string;
    type: "price_above" | "price_below" | "percent_change";
    threshold: number;
    triggered: boolean;
    triggeredAt?: Date;
  }[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Alert Engine

```typescript
// src/services/alertEngine.service.ts (NEW)
export class AlertEngineService {
  async createAlert(userId: string, watchlistId: string, alert: AlertConfig): Promise<Alert> { }
  
  async checkAlerts(): Promise<void> {
    // Executar a cada minuto via worker
    // Verificar todas as alerts ativas
    // Disparar notificações quando thresholds são atingidos
  }

  async dismissAlert(alertId: string): Promise<void> { }
}
```

### 3.4 Report Generation

```typescript
// src/services/reportGeneration.service.ts (NEW)
export class ReportGenerationService {
  async generatePDFReport(portfolio: Portfolio, options: ReportOptions): Promise<Buffer> {
    // Usar pdfkit ou similar
    // Gerar relatório com gráficos e análises
  }

  async generateExcelReport(portfolio: Portfolio, includeHistory: boolean): Promise<Buffer> {
    // Usar xlsx library
  }

  async scheduleEmailReport(portfolio: Portfolio, schedule: CronExpression): Promise<void> {
    // Configurar job recorrente
  }
}
```

---

## 🛠️ Semana 4: Performance & DevOps

### 4.1 Caching Strategy

```typescript
// src/services/cacheService.ts - Enhanced
export class CacheService {
  private redis: RedisClient;

  // Estratégia de cache em camadas
  async get<T>(key: string): Promise<T | null> {
    // L1: Memory cache (in-process)
    // L2: Redis cache
    // L3: Database
  }

  // TTL Strategy
  const cacheTTL = {
    stockPrices: 5 * 60, // 5 min
    newsArticles: 30 * 60, // 30 min
    technicalIndicators: 60 * 60, // 1 hour
    portfolioAnalysis: 24 * 60 * 60, // 1 day
    userPreferences: 7 * 24 * 60 * 60, // 7 days
  };
}
```

### 4.2 Database Optimization

```typescript
// MongoDB Indexes Optimization
db.Stock.createIndex({ symbol: 1 }); // Lookup rápido
db.Stock.createIndex({ "technicalIndicators.lastUpdated": -1 }); // Time-series
db.News.createIndex({ "sentiment.label": 1, publishedAt: -1 }); // Sentiment filtering
db.Portfolio.createIndex({ userId: 1, "assets.symbol": 1 }); // User portfolio lookup
db.Portfolio.createIndex({ userId: 1, createdAt: -1 }); // User portfolio history

// Query Optimization
// ❌ Bad: Fetch all, filter in memory
db.Portfolio.find({}).toArray()

// ✅ Good: Filter at DB level
db.Portfolio.find({ userId: ObjectId("..."), "assets.performancePercent": { $gt: 10 } })
```

### 4.3 Monitoring & Observability

```typescript
// src/observability/metrics.ts - Enhanced
export class MetricsCollector {
  recordAPILatency(endpoint: string, duration: number): void { }
  recordErrorRate(service: string, errorCount: number): void { }
  recordCacheHitRate(cacheName: string, hit: boolean): void { }
  recordDatabaseQueryTime(query: string, duration: number): void { }
}

// Prometheus Metrics
const apiLatency = new Histogram('api_latency_ms', 'API latency in milliseconds', ['endpoint']);
const errorRate = new Counter('errors_total', 'Total errors', ['service', 'type']);
const cacheHitRate = new Gauge('cache_hit_rate', 'Cache hit rate', ['cache_name']);
```

### 4.4 CI/CD Pipeline

```yaml
# .github/workflows/main.yml
name: API Build & Deploy

on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run typecheck
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Validate OpenAPI
        run: npm run contract:openapi
      
      - name: Build
        run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Deploy script
          npm run build
          node dist/server.js
```

---

## 📊 Performance Targets

| Métrica | Target | Método |
|---------|--------|--------|
| API Response Time (p95) | < 200ms | APM Monitoring |
| Database Query Time | < 50ms | Query logging |
| Cache Hit Rate | > 85% | Redis monitoring |
| Error Rate | < 0.5% | Sentry tracking |
| Uptime | > 99.5% | Health checks |

---

## 🔐 Security Checklist

- [ ] Validar todas as inputs (sanitização)
- [ ] Implementar rate limiting
- [ ] HTTPS/TLS obrigatório
- [ ] CORS adequadamente configurado
- [ ] JWT com expiração curta
- [ ] Refresh tokens em HttpOnly cookies
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (content security headers)
- [ ] CSRF protection
- [ ] Helmet.js headers
- [ ] Secrets management (env vars)
- [ ] Logging de eventos sensíveis

---

## 📦 Dependencies Necessárias

```json
{
  "talib-binding": "^1.0.0",
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.0",
  "pdfkit": "^0.13.0",
  "xlsx": "^0.18.0",
  "prometheus-client": "^14.0.0",
  "node-schedule": "^2.1.0"
}
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// tests/services/stock.analysis.spec.ts
describe('StockAnalysisService', () => {
  it('should calculate RSI correctly', () => {
    const prices = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10];
    const rsi = service.calculateRSI(prices);
    expect(rsi).toBeCloseTo(70.46, 1);
  });
});
```

### Integration Tests
```typescript
// tests/api/stock.analysis.integration.spec.ts
describe('Stock Analysis API', () => {
  it('GET /api/stock/AAPL/analysis/advanced should return technical indicators', async () => {
    const response = await request(app)
      .get('/api/stock/AAPL/analysis/advanced')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('technicalIndicators');
  });
});
```

### Load Tests
```typescript
// tests/load/api.load.spec.ts
describe('API Load Testing', () => {
  it('should handle 1000 concurrent requests', async () => {
    const promises = Array(1000).fill().map(() =>
      request(app).get('/api/stock/AAPL/price')
    );
    
    const results = await Promise.all(promises);
    expect(results.filter(r => r.status === 200).length).toBeGreaterThan(950);
  });
});
```

---

**Última Atualização**: 17 Mar 2026  
**Aprovação Necessária**: Tech Lead, Product Owner  
**Status**: Em Planejamento
