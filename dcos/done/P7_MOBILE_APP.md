# P7 — Mobile App: Android & iOS

## Visao

Apos o beta release em desktop, expandir o FinHub para mobile nativo/hibrido, aproveitando o backend REST existente sem alteracoes e maximizando a reutilizacao do trabalho feito no frontend web.

**Pre-requisito obrigatorio:** Beta desktop estavel, validado pelos primeiros utilizadores reais.

---

## Estado atual (referencia)

- **Backend:** Express + TypeScript — totalmente reutilizavel, zero alteracoes necessarias.
- **Frontend web:** React + Vite + Tailwind + shadcn/ui — nao e diretamente portavel para nativo, mas a logica reutiliza-se.
- **Autenticacao, perfis, criadores, REIT/Stocks toolkit** — logica de negocio e hooks reutilizaveis independentemente da abordagem.

---

## Estrategia recomendada: Faseamento em 3 niveis

```
Beta Desktop
     |
     v
[P7.0] PWA  ------------>  Android instalavel (dias)
     |                     iOS limitado (Safari)
     v
[P7.1] Capacitor -------->  Google Play + App Store (semanas)
     |                     WebView com plugins nativos
     v
[P7.2] React Native ------>  App 100% nativa (meses, se necessario)
```

---

## P7.0 — PWA (Progressive Web App)

### O que e
A app web atual e servida num browser, mas com um `manifest.json` e um Service Worker, o utilizador pode "instalar" a app no ecra principal do telefone, como se fosse uma app nativa. Nao passa pelas stores.

### Passos de implementacao

#### 1. Criar o Web App Manifest

Ficheiro: `FinHub-Vite/public/manifest.json`

```json
{
  "name": "FinHub",
  "short_name": "FinHub",
  "description": "Ferramentas financeiras para investidores",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-72.png",   "sizes": "72x72",   "type": "image/png" },
    { "src": "/icons/icon-96.png",   "sizes": "96x96",   "type": "image/png" },
    { "src": "/icons/icon-128.png",  "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png",  "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152.png",  "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192.png",  "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-384.png",  "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512.png",  "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/home.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

Referenciar no `index.html`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3b82f6" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="FinHub" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

#### 2. Registar o Service Worker

Instalar `vite-plugin-pwa`:
```bash
npm install -D vite-plugin-pwa
```

Configurar em `vite.config.ts`:
```ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: false, // usar o manifest.json manual em /public
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache das chamadas ao backend por 5 minutos
            urlPattern: /^https:\/\/api\.finhub\.pt\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
})
```

#### 3. Auditoria Responsive

Ecras alvo:
- 375px — iPhone SE / iPhone 13 mini
- 390px — iPhone 14 / 15
- 412px — Android medio (Pixel, Samsung Galaxy)
- 428px — iPhone 14 Plus / Pro Max

Checklist por pagina:
- [ ] Sidebar/navbar colapsada em mobile (hamburger ou bottom nav)
- [ ] Tabelas com scroll horizontal ou substituidas por cards
- [ ] Charts (recharts) com `width: '100%'` e `aspect` adequado
- [ ] Inputs e botoes com `min-height: 44px` (Apple HIG) / `48dp` (Material)
- [ ] Modais com `max-height: 90vh` e scroll interno
- [ ] Fontes legíveis (min 14px corpo, 12px secundario)

#### 4. Limitacoes iOS Safari (PWA)
- Sem Web Push Notifications (ate iOS 16.4 — a partir dai, limitado)
- Sem Background Sync
- Sem acesso a Bluetooth, NFC
- A app e encerrada quando vai para background (sem keep-alive)
- Solucao: aceitar limitacoes no nivel PWA, Capacitor resolve isto

---

## P7.1 — Capacitor (Hibrido — Recomendado)

### O que e
Capacitor (da Ionic) empacota a app web num WebView nativo Android/iOS. O utilizador instala uma app "verdadeira" das stores, mas o conteudo e a app web correndo dentro de um container nativo.

**Performance:** Adequada para dashboards de dados financeiros — nao e um jogo 3D.
**Reutilizacao:** 100% do frontend web sem reescrita de UI.

### Requisitos de sistema

| Plataforma | Requisito |
|-----------|-----------|
| Android build | Node.js, Android Studio, Java 17+, Android SDK |
| iOS build | **Mac obrigatorio**, Xcode 15+, conta Apple Developer ($99/ano) |
| Ambos | Node.js 18+, npm/pnpm |

### Instalacao passo a passo

```bash
# No diretorio FinHub-Vite/
npm install @capacitor/core @capacitor/cli
npx cap init "FinHub" "pt.finhub.app" --web-dir dist

# Adicionar plataformas
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
```

Ficheiro gerado: `capacitor.config.ts`
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pt.finhub.app',
  appName: 'FinHub',
  webDir: 'dist',
  server: {
    // Em desenvolvimento, apontar para o servidor Vite local
    // url: 'http://192.168.1.X:5173',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f172a',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

### Workflow de build

```bash
# 1. Build da app web
npm run build

# 2. Sincronizar com Capacitor (copia dist/ para android/app/src/main/assets/)
npx cap sync

# 3. Abrir no IDE nativo para testar/publicar
npx cap open android   # Abre Android Studio
npx cap open ios       # Abre Xcode (requer Mac)
```

### Routing — problema critico

O react-router em modo `history` (BrowserRouter) nao funciona dentro de um WebView sem servidor. Solucao:

**Opcao A (recomendada):** Usar `HashRouter` em modo Capacitor:
```tsx
// main.tsx
import { Capacitor } from '@capacitor/core';
const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
```

**Opcao B:** Configurar `server.androidScheme` e `server.hostname` no `capacitor.config.ts`:
```ts
server: {
  androidScheme: 'https',
  hostname: 'app.finhub.pt',
}
```

### Autenticacao — adaptar cookies/JWT

Se o backend usa cookies HttpOnly, podem ter problemas no WebView. Verificar:
- Se usa JWT em `localStorage` — funciona sem alteracoes
- Se usa cookies — adicionar `server.allowNavigation` e verificar CORS com o dominio do Capacitor

### Plugins Capacitor a instalar

```bash
npm install @capacitor/push-notifications
npm install @capacitor/status-bar
npm install @capacitor/splash-screen
npm install @capacitor/app
npm install @capacitor/haptics
npm install @capacitor/browser
npm install @capacitor/network
npm install @capacitor/preferences   # substituto do localStorage para dados persistentes
```

#### Push Notifications — setup completo

**Backend necessario:** Um endpoint para guardar os device tokens e um servico para enviar notificacoes.

Servicos recomendados:
- **Firebase Cloud Messaging (FCM)** — gratuito, suporta Android e iOS
- **OneSignal** — mais facil de integrar, plano gratuito generoso

Fluxo:
1. App pede permissao ao utilizador
2. FCM devolve um token unico do dispositivo
3. App envia o token para o backend FinHub (`POST /api/notifications/register`)
4. Backend guarda o token associado ao utilizador
5. Quando ha um evento (alerta de preco, novo conteudo), backend chama a API FCM com o token

```ts
// Exemplo de integracao no frontend
import { PushNotifications } from '@capacitor/push-notifications';

export async function setupPushNotifications(userId: string) {
  const result = await PushNotifications.requestPermissions();
  if (result.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    await fetch('/api/notifications/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token: token.value, platform: Capacitor.getPlatform() }),
    });
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Notificacao recebida:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // Navegar para o ecra correto ao clicar na notificacao
    const data = action.notification.data;
    if (data?.route) router.push(data.route);
  });
}
```

#### Network Status — modo offline

```ts
import { Network } from '@capacitor/network';

Network.addListener('networkStatusChange', (status) => {
  if (!status.connected) {
    // Mostrar banner "Sem conexao — a mostrar dados em cache"
    showOfflineBanner();
  }
});
```

### Safe Areas (notch, home indicator)

Adicionar ao CSS global:
```css
:root {
  --sat: env(safe-area-inset-top);
  --sar: env(safe-area-inset-right);
  --sab: env(safe-area-inset-bottom);
  --sal: env(safe-area-inset-left);
}

body {
  padding-top: var(--sat);
  padding-bottom: var(--sab);
}

/* Navbar inferior (se existir) */
.bottom-nav {
  padding-bottom: calc(var(--sab) + 8px);
}
```

No `index.html`, adicionar:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### Navegacao mobile — Bottom Navigation

Em mobile, substituir a sidebar lateral por uma bottom navigation bar com os 4-5 destinos principais:
- Home / Dashboard
- Stocks / REIT Toolkit
- Portfolio
- Comunidade / Feed
- Perfil

```tsx
// Mostrar apenas em mobile nativo
import { Capacitor } from '@capacitor/core';

const isMobile = Capacitor.isNativePlatform();
// ou via CSS: md:hidden para esconder em desktop
```

### Deep Links

Permitir links como `finhub://stock/AAPL` ou `https://app.finhub.pt/stock/AAPL` abrirem a app.

**Android** — `android/app/src/main/AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="app.finhub.pt" />
</intent-filter>
```

**iOS** — requer ficheiro `apple-app-site-association` no servidor:
```json
{
  "applinks": {
    "details": [{ "appIDs": ["TEAMID.pt.finhub.app"], "components": [{ "/": "/*" }] }]
  }
}
```

---

## P7.2 — Publicacao nas Stores

### Google Play Store

**Requisitos:**
- Conta Google Play Developer — $25 (pagamento unico)
- APK ou AAB assinado
- Politica de privacidade publica (URL)
- Screenshots: minimo 2, ate 8 (1080x1920px ou 1920x1080px)
- Icone: 512x512px PNG

**Processo:**
1. Gerar keystore de assinatura (guardar em local seguro — perder = impossivel publicar updates):
   ```bash
   keytool -genkey -v -keystore finhub-release.keystore \
     -alias finhub -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Configurar assinatura no `android/app/build.gradle`
3. Build release: `./gradlew bundleRelease` (gera `.aab`)
4. Upload para Google Play Console → Internal Testing → Closed Testing → Production
5. Review: normalmente 1-3 dias na primeira submissao

**IMPORTANTE:** Guardar o ficheiro `.keystore` e a senha num local seguro (password manager, backup encriptado). Se perder, nao consegue publicar updates para a app existente.

### Apple App Store

**Requisitos:**
- Mac com Xcode 15+ (obrigatorio — nao ha alternativa)
- Conta Apple Developer: $99/ano
- Certificado de distribuicao + Provisioning Profile (geridos pelo Xcode ou manualmente)
- Screenshots para cada tamanho de ecra suportado (iPhone 6.7", 6.5", 5.5")
- Politica de privacidade obrigatoria

**Processo:**
1. Criar App ID no Apple Developer Portal
2. Criar certificado de distribuicao
3. Criar Provisioning Profile para distribuicao App Store
4. No Xcode: Product → Archive → Distribute App → App Store Connect
5. Configurar a app no App Store Connect (descricao, screenshots, classificacao etaria)
6. Submit para review: 1-7 dias (mais rigoroso que Google)

**TestFlight:** Distribuir para beta testers antes do launch publico. Ate 10.000 testers externos.

**Classificacao etaria:** Para conteudo financeiro, tipicamente "4+" ou "17+" dependendo se ha compras ou conteudo de investimento real. Verificar guidelines da Apple para apps financeiras.

---

## P7.3 — Funcionalidades Mobile-first (pos-launch)

### Alertas de Preco / Notificacoes

Backend necessario:
```
POST /api/alerts          — criar alerta (ticker, tipo, valor)
GET  /api/alerts          — listar alertas do utilizador
DELETE /api/alerts/:id    — remover alerta
```

Job no backend (cron a cada 15min):
- Verificar precos atuais vs alertas configurados
- Para cada alerta ativo, chamar FCM se a condicao for cumprida

### Widget para Ecra Principal

**Android:** Widgets nativos requerem codigo Java/Kotlin nativo — nao suportado diretamente pelo Capacitor. Opcoes:
- Plugin `capacitor-widgetkit` (community) — limitado
- Modulo nativo separado (complexidade alta)

**iOS:** WidgetKit — mesmo problema, requer Swift nativo.

**Recomendacao:** Adiar para P7.4 ou apos validacao de mercado.

### Biometria para Login

```bash
npm install @capacitor-community/biometric-auth
```

```ts
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

async function loginComBiometria() {
  const result = await BiometricAuth.authenticate({
    reason: 'Confirme a sua identidade para aceder ao FinHub',
    cancelTitle: 'Cancelar',
    allowDeviceCredential: true,
  });
  if (result.verified) {
    // Recuperar token guardado em Keychain (iOS) / Keystore (Android)
    const token = await Preferences.get({ key: 'auth_token' });
    // Fazer login com o token
  }
}
```

**Seguranca:** Nunca guardar a password — guardar apenas o JWT/token em `@capacitor/preferences` (que usa Keychain no iOS e Keystore no Android, encriptados pelo SO).

### Modo Offline

Estrategia de cache:
- Dados estaticos (perfis, historico) — cache 24h no Service Worker / SQLite local
- Dados de mercado (precos, indicadores) — cache 5min com indicador "dados desatualizados"
- Acoes do utilizador offline (favoritos, notas) — queue local, sync quando volta online

Plugin para SQLite local: `@capacitor-community/sqlite`

---

## Decisoes em aberto

| Decisao | Opcoes | Recomendacao |
|---------|--------|--------------|
| Nivel inicial | PWA vs Capacitor | PWA para validar, Capacitor para stores |
| Push backend | FCM direto vs OneSignal | OneSignal (mais simples de integrar) |
| Routing mobile | HashRouter vs configuracao servidor | HashRouter para Capacitor |
| Monetizacao in-app | Nenhuma / IAP / Subscricao | Paridade com web — sem IAP no inicio |
| Mac para iOS | Comprar vs usar servico cloud | Mac Mini M2 (melhor ROI a longo prazo) |
| React Native futuro | Sim / Nao | So se Capacitor provar ser insuficiente |
| Widgets nativos | P7.3 vs P7.4 | Adiar para P7.4 |

---

## Metricas de sucesso

| Metrica | Target 3 meses pos-launch |
|---------|--------------------------|
| Instalaçoes (ambas stores) | > 500 |
| Rating medio | >= 4.2 estrelas |
| Retencao D7 | > 40% |
| Crash-free sessions | > 99% |
| Sessao media | > 3 minutos |

---

## Notas legais e de compliance

- **Politica de privacidade:** Obrigatoria antes do submit em ambas as stores. Mencionar: dados recolhidos, uso de notificacoes, terceiros (FMP API, analytics).
- **App Store financeira:** A Apple pode exigir disclaimers sobre conteudo nao ser conselho financeiro — adicionar no onboarding e na descricao da store.
- **GDPR:** Se usuarios europeus, manter compliance (ja deve estar feito no backend). A app mobile herda as mesmas obrigacoes.
- **Google Play Fees:** A partir de 2024, compras in-app teem taxa de 15% (ate $1M/ano) ou 30%. Se houver subscricoes via app, considerar o impacto.

---

## Checklist antes de comecar P7

- [ ] Beta desktop estavel (0 bugs criticos durante 2+ semanas)
- [ ] Primeiros utilizadores reais a usar a plataforma
- [ ] Dominio `app.finhub.pt` ou similar configurado (para deep links e PWA)
- [ ] Politica de privacidade redigida e publicada
- [ ] Icones da app desenhados em alta resolucao (512x512px minimo)
- [ ] Conta Google Play Developer criada ($25)
- [ ] Conta Apple Developer criada ($99/ano) — se iOS for prioridade
- [ ] Decisao sobre estrategia de notificacoes (FCM vs OneSignal)

---

*Documento criado em 2026-03-10. Pre-requisito: beta desktop concluido e validado.*
*Nivel recomendado para comecar: P7.0 (PWA) imediatamente apos beta, P7.1 (Capacitor) na primeira iteracao mobile dedicada.*
