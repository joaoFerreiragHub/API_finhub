# FinHub API - Resources & References (4-Week Roadmap)

**Data**: 17 Mar 2026 | **Versão**: 1.0

---

## 📚 Recursos por Funcionalidade

### Semana 1: Stock Analysis & News Integration

#### Technical Indicators Implementation
- **RSI (Relative Strength Index)**
  - Formula: RSI = 100 - (100 / (1 + RS)), where RS = Avg Gain / Avg Loss
  - Reference: [Investopedia RSI Guide](https://www.investopedia.com/terms/r/rsi.asp)
  - Period: 14 days (standard)
  - Signal: > 70 = Overbought, < 30 = Oversold

- **MACD (Moving Average Convergence Divergence)**
  - Components: MACD Line, Signal Line, Histogram
  - Reference: [MACD Tutorial](https://school.stockcharts.com/doku.php?id=technical_indicators:macd)
  - EMA 12, EMA 26, Signal 9
  - Usage: Identify trend momentum

- **Bollinger Bands**
  - Formula: BB = SMA ± (StdDev × 2)
  - Reference: [BB Guide](https://en.wikipedia.org/wiki/Bollinger_Bands)
  - Standard: 20-period SMA, 2 std dev
  - Usage: Volatility and reversal identification

#### Libraries & Tools
```bash
# Installation
npm install talib-binding speakeasy qrcode pdfkit xlsx

# Alternatives (if talib has issues)
npm install technicalindicators  # Pure JS implementation
npm install @napi-rs/talib       # Rust binding (faster)
```

#### Data Sources
- **Yahoo Finance API**
  - Docs: [yahoo-finance2](https://github.com/yprasad0/yahoo-finance2)
  - Rate Limit: 2000 req/hour
  - Reliability: 99.5% uptime SLA
  - Fallback: Finnhub, IEX Cloud (paid)

- **News Sources**
  - RSS Feeds: TradingView, MarketWatch, Yahoo Finance
  - API: NewsAPI, GNews, Finnhub
  - Processing: RSS Parser (npm package)

#### Learning Resources
- [Technical Analysis 101](https://www.investopedia.com/articles/forex/09/technical-analysis-basics.asp)
- [Financial Indicators](https://school.stockcharts.com/doku.php?id=technical_indicators)
- [Sentiment Analysis in Finance](https://medium.com/towards-data-science/sentiment-analysis-for-finance-9e3c2c5b5b8d)

---

### Semana 2: Authentication & Security

#### MFA Implementation
**TOTP (Time-based One-Time Password)**
- RFC 6238 Standard
- Libraries:
  ```bash
  npm install speakeasy otpauth-for-js
  ```
- Example Implementation:
  ```typescript
  import * as speakeasy from 'speakeasy';
  
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: 'FinHub (user@example.com)',
    issuer: 'FinHub',
    length: 32
  });
  
  // Verify code
  const verified = speakeasy.totp.verify({
    secret: userSecret,
    encoding: 'base32',
    token: userInput,
    window: 2
  });
  ```
- QR Code Generation: `npm install qrcode`

#### JWT Best Practices
- **Token Structure**: Header.Payload.Signature
- **Short-lived tokens**: 15 min access token
- **Long-lived tokens**: 7 days refresh token (HttpOnly cookie)
- **Signing algorithm**: HS256 (HMAC) or RS256 (RSA)
- Reference: [JWT.io](https://jwt.io/)

#### Security Standards
- **OWASP Top 10 2021**: https://owasp.org/Top10/
- **CWE Top 25**: https://cwe.mitre.org/top25/
- **Security Headers**: https://securityheaders.com/

#### Tools & Frameworks
```bash
# Helmet.js - Secure HTTP headers
npm install helmet

# bcryptjs - Password hashing
npm install bcryptjs

# express-rate-limit - Rate limiting
npm install express-rate-limit rate-limit-redis

# Zod/Joi - Input validation
npm install zod joi
```

#### Learning Resources
- [Auth0 - JWT Handbook](https://auth0.com/e-books/jwt-handbook)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)

---

### Semana 3: Portfolio & Advanced Features

#### Portfolio Risk Analysis Formulas

**Sharpe Ratio**
```
Sharpe = (Rp - Rf) / σp
Where:
- Rp = Portfolio Return
- Rf = Risk-free Rate (e.g., 10Y Treasury at 4%)
- σp = Portfolio Standard Deviation

Interpretation: > 1.0 = Good, > 2.0 = Very Good
```

**Beta Coefficient**
```
Beta = Cov(Rp, Rm) / Var(Rm)
Where:
- Cov = Covariance between portfolio and market
- Var = Variance of market returns

Beta = 1.0: Moves with market
Beta > 1.0: More volatile than market
Beta < 1.0: Less volatile than market
```

**Value at Risk (VaR)**
```
VaR(95%) = Expected Loss at 95% confidence level

Methods:
1. Historical Simulation
2. Parametric (Normal Distribution)
3. Monte Carlo

Interpretation: "There's 5% chance of losing more than $X in 1 day"
```

#### Tools & Libraries
```bash
# Statistical calculations
npm install mathjs numeric

# Portfolio optimization
npm install portfolio-optimizer

# Charting
npm install chart.js plotly.js

# Report generation
npm install pdfkit xlsx
```

#### Asset Correlation
```typescript
// Pearson Correlation
correlation = covariance(asset1, asset2) / (σ1 × σ2)

// -1.0: Perfect negative correlation
//  0.0: No correlation
//  1.0: Perfect positive correlation
```

#### Learning Resources
- [Modern Portfolio Theory](https://en.wikipedia.org/wiki/Modern_portfolio_theory)
- [Sharpe Ratio Calculator](https://www.investopedia.com/investing/sharpe-ratio-define-it-use-it/)
- [Risk Management in Finance](https://www.cfa.org/research/articles/risk-management)

---

### Semana 4: Performance & DevOps

#### Performance Optimization Techniques

**Database Optimization**
- Compound Indexes: `db.collection.createIndex({ field1: 1, field2: -1 })`
- Query Profiling: `db.setProfilingLevel(1)`
- Explain Plans: `db.collection.find().explain("executionStats")`
- Aggregation Pipeline: Use $match early

**Caching Strategy**
```
Cache Layers:
1. Application-level (in-memory) - Ultra fast
2. Redis - Fast, distributed
3. HTTP caching - Browser level
4. CDN - Geographic distribution

TTL Strategy:
- Real-time data: 5-10 min
- Market data: 15-30 min
- News: 30-60 min
- Analysis: 1-24 hours
- User data: 7 days
```

**Query Optimization**
```typescript
// ❌ BAD: N+1 queries
portfolios.forEach(p => {
  const assets = db.find({ portfolioId: p._id }); // N queries!
});

// ✅ GOOD: Join/Populate
const portfolios = db.find().populate('assets');

// ✅ BEST: Aggregation pipeline
db.Portfolio.aggregate([
  { $match: { userId: ObjectId("...") } },
  { $lookup: { from: "assets", ... } },
  { $project: { ... } }
]);
```

#### Monitoring & Observability

**Prometheus Metrics**
```typescript
// Counter: Always increasing
const apiCalls = new Counter('api_calls_total', 'Total API calls', ['method', 'endpoint']);
apiCalls.labels('GET', '/api/stock').inc();

// Gauge: Can go up or down
const activeConnections = new Gauge('active_connections', 'Active connections');
activeConnections.set(42);

// Histogram: Distribution over time
const requestDuration = new Histogram('request_duration_seconds', 'Request duration', ['route']);
requestDuration.labels('/api/stock').observe(0.123);
```

**Sentry Configuration**
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ request: true, serverName: true }),
    new Sentry.Integrations.OnUncaughtException(),
  ],
});
```

#### CI/CD Pipeline

**GitHub Actions Workflow**
```yaml
name: Test & Deploy
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6.0
        options: >-
          --health-cmd mongosh
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

#### Tools & Services
```bash
# Monitoring
npm install prometheus-client

# Logging
npm install winston pino

# APM
npm install @sentry/node

# Load testing
npm install artillery k6

# Container
Docker + docker-compose (for dev)
Kubernetes (for production)
```

#### Learning Resources
- [Site Reliability Engineering (SRE)](https://sre.google/sre-book/)
- [The Phoenix Project](https://itrevolution.com/the-phoenix-project/)
- [DevOps Handbook](https://itrevolution.com/the-devops-handbook/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/histograms/)

---

## 🔧 Development Environment Setup

### Prerequisites
```bash
Node.js: ≥ 20.0.0
npm: ≥ 10.0.0
MongoDB: ≥ 6.0
Redis: ≥ 7.0
```

### Initial Setup
```bash
# Clone repository
git clone <repo-url>
cd API_finhub

# Install dependencies
npm ci

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start services (if using Docker)
docker-compose up -d

# Run migrations
npm run migrate

# Seed data (optional)
npm run seed

# Start development server
npm run dev
```

### Important Files
```
.
├── src/
│   ├── models/          # Mongoose schemas
│   ├── services/        # Business logic
│   ├── controllers/      # Request handlers
│   ├── middlewares/      # Express middlewares
│   ├── routes/          # API routes
│   ├── utils/           # Helper functions
│   ├── types/           # TypeScript types
│   └── config/          # Configuration
├── tests/               # Test files
├── docs/               # Documentation
├── .env.example        # Environment template
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
└── README.md           # Project overview
```

---

## 📞 Communication & Escalation

### Slack Channels
- `#api-development`: Daily updates
- `#api-blockers`: Critical issues
- `#api-security`: Security concerns
- `#devops-engineering`: Infrastructure

### Emergency Contacts
```
Tech Lead: [Name] - [Email] - [Phone]
Product Owner: [Name] - [Email]
DevOps: [Name] - [Email]
Security: [Name] - [Email]
```

### Incident Response
1. **Discovery**: Someone reports issue
2. **Alert**: Automated or manual escalation
3. **Response**: On-call engineer investigates
4. **Mitigation**: Quick fix or rollback
5. **Resolution**: Root cause analysis
6. **Post-mortem**: Document and improve

---

## 📊 Performance Benchmarks

### Current Baseline (Before Roadmap)
```
Metric                    | Value
--------------------------|--------
API Response Time (p95)  | 350ms
Database Query Time (p95)| 120ms
Cache Hit Rate           | 60%
Error Rate               | 2.1%
Uptime                   | 98.2%
```

### Targets (After Roadmap)
```
Metric                    | Target  | Improvement
--------------------------|---------|-------------
API Response Time (p95)  | 200ms   | -43%
Database Query Time (p95)| 50ms    | -58%
Cache Hit Rate           | 85%     | +25pp
Error Rate               | 0.5%    | -76%
Uptime                   | 99.5%   | +1.3pp
```

---

## 🔐 Security References

### Standards & Compliance
- **OWASP Top 10**: https://owasp.org/Top10/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework
- **PCI DSS** (if handling payments): https://www.pcisecuritystandards.org/
- **GDPR** (if EU users): https://gdpr.eu/

### Security Tools
```bash
# Dependency scanning
npm audit
npm install -g snyk

# Code scanning
npm install -D eslint-plugin-security
npm install -D @typescript-eslint/eslint-plugin

# Secrets management
npm install dotenv aws-sdk/client-secrets-manager
```

### Vulnerability Databases
- [NVD - National Vulnerability Database](https://nvd.nist.gov/)
- [CVE Database](https://www.cvedetails.com/)
- [GitHub Security Advisories](https://github.com/advisories)

---

## 📚 Additional Learning Materials

### Courses
- **Udemy**: Node.js, Express, MongoDB fundamentals
- **Frontend Masters**: TypeScript and advanced patterns
- **Coursera**: Data Science for Finance

### Books
- "Clean Code" - Robert C. Martin
- "The Pragmatic Programmer" - Hunt & Thomas
- "Design Patterns" - Gang of Four
- "Refactoring" - Martin Fowler

### Blogs & Podcasts
- [Martin Fowler Blog](https://martinfowler.com/)
- [Hacker News](https://news.ycombinator.com/)
- [Dev.to](https://dev.to/)
- [The Changelog](https://changelog.com/)

---

## 🎬 Quick Reference Checklist

### Before Starting Each Feature
- [ ] Read specification document
- [ ] Review existing code patterns
- [ ] Setup development environment
- [ ] Create git branch with naming convention
- [ ] Add to task tracking system

### During Development
- [ ] Write tests alongside code
- [ ] Commit frequently with meaningful messages
- [ ] Keep PR/MR description updated
- [ ] Request code review daily
- [ ] Document as you go

### Before Merging
- [ ] All tests passing locally
- [ ] Code review approved
- [ ] No linting issues
- [ ] Coverage increased or maintained
- [ ] Documentation updated

### Before Release
- [ ] Staging environment validated
- [ ] Performance benchmarks acceptable
- [ ] Security audit passed
- [ ] All stakeholders approved
- [ ] Rollback plan ready

---

## 📅 Important Dates & Deadlines

| Date | Event | Owner |
|------|-------|-------|
| 17 Mar | Kickoff | Tech Lead |
| 23 Mar | Semana 1 Review | Product Owner |
| 30 Mar | Semana 2 Review | Product Owner |
| 6 Abr | Semana 3 Review | Product Owner |
| 14 Abr | Final Delivery & Go-Live | Tech Lead |

---

## 📞 Support & Help

### Getting Help
1. Check documentation first
2. Search GitHub issues
3. Ask in Slack
4. Tag code owner for review
5. Escalate to Tech Lead if blocked

### Common Issues & Solutions
```
Issue: "Port 3000 already in use"
Solution: kill -9 $(lsof -t -i:3000) || npx kill-port 3000

Issue: "MongoDB connection refused"
Solution: Check docker-compose, ensure mongod is running

Issue: "Redis connection timeout"
Solution: Check Redis port (6379), restart docker container

Issue: "TypeScript compilation errors"
Solution: npx tsc --noEmit, check tsconfig.json
```

---

**Last Updated**: 17 Mar 2026  
**Next Review**: Weekly (Every Friday at 5 PM)  
**Responsible Party**: Tech Lead & Product Owner

---

## Quick Links

- 📖 [Main Roadmap](./ROADMAP.md)
- 🔧 [Technical Specifications](./TECHNICAL_SPECIFICATIONS.md)
- ✅ [Weekly Tasks](./WEEKLY_TASKS.md)
- 📊 [Metrics & KPIs](./METRICS.md)
