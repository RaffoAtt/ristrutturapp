# 🚀 Guida Deployment - Dalla Sviluppo alla Produzione

**Status:** Pronto per il deployment  
**Data:** 10/08/2026  
**Versione App:** 1.0.0

---

## 📋 Checklist Pre-Deployment

Prima di pubblicare, verifica:

- [ ] App testata completamente in locale
- [ ] Login/Signup funzionante
- [ ] Dashboard carica correttamente
- [ ] Nessun errore in console (F12)
- [ ] Credenziali Supabase sicure (non in git)
- [ ] Manifest.json aggiornato
- [ ] PWA funzionante offline (service worker)
- [ ] Performance ottimizzate

---

## 🌐 OPZIONE 1: Deployment su Vercel (CONSIGLIATO - Gratuito)

### Prerequisiti
- Account GitHub (gratuito)
- Account Vercel (gratuito, collegato a GitHub)

### Step 1: Preparare il Repository Git

```bash
# Dalla cartella del progetto
git init
git add .
git commit -m "Initial commit - RistrutturaApp v1.0.0"
```

### Step 2: Creare Repository su GitHub

1. Vai su https://github.com/new
2. Crea un nuovo repository: `ristruttura-app`
3. Aggiungi il remote:
```bash
git remote add origin https://github.com/TUO_USERNAME/ristruttura-app.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy su Vercel

1. Vai su https://vercel.com
2. Clicca **"New Project"**
3. Seleziona il repository `ristruttura-app` da GitHub
4. Configura:
   - **Framework:** Static Site
   - **Build Command:** (vuoto - app statica)
   - **Output Directory:** ./
5. Aggiungi Environment Variables:
   - Nome: `VITE_SUPABASE_URL`
   - Valore: `https://tijhdittlhfjcoucpnex.supabase.co`
   - Nome: `VITE_SUPABASE_KEY`
   - Valore: (la tua anon key)
6. Clicca **"Deploy"**

**Risultato:** App disponibile su `https://ristruttura-app-xyz.vercel.app`

---

## 🌐 OPZIONE 2: Deployment su Netlify (ALTERNATIVA - Gratuito)

### Step 1-2: (Stesso di Vercel - preparare Git)

### Step 3: Deploy su Netlify

1. Vai su https://app.netlify.com
2. Clicca **"Add new site"** → **"Import an existing project"**
3. Seleziona GitHub e il repository
4. Configura:
   - **Build command:** (vuoto)
   - **Publish directory:** ./
5. Clicca **"Deploy site"**

**Risultato:** App disponibile su `https://ristruttura-app.netlify.app`

---

## 🌐 OPZIONE 3: Deployment su Firebase Hosting

### Prerequisites
- Account Google (gratuito)
- Firebase CLI

### Step 1: Installare Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

### Step 2: Build e Deploy

```bash
firebase deploy
```

**Risultato:** App disponibile su `https://ristruttura-app.firebaseapp.com`

---

## 🔒 Configurare il Dominio Personalizzato

### Su Vercel
1. Vai al progetto → Settings → Domains
2. Aggiungi il tuo dominio (es: `ristruttura.com`)
3. Configura i nameserver nel registrar del dominio
4. SSL certificate automatico (Let's Encrypt)

### Su Netlify
1. Vai al progetto → Domain settings
2. Aggiungi il tuo dominio personalizzato
3. Configura DNS nel registrar
4. SSL automatico

### Su Firebase
1. Vai a Hosting → Domain
2. Connetti il tuo dominio
3. SSL automatico

---

## 📱 Configurare PWA per App Store/Play Store

### PWA su iOS (App Store)
**Opzione 1 - Web App Shortcut:**
- Gli utenti possono aggiungere a Home Screen
- Funziona via Safari
- Nessuna app store necessaria

**Opzione 2 - App Wrapper (Pro):**
- Usare servizi come Capacitor o Cordova
- Wrappare la web app in app nativa
- Pubblicare su App Store

### PWA su Android (Play Store)
**Opzione 1 - Web App Shortcut:**
- Aggiungere a Home Screen via Chrome
- Funziona come app

**Opzione 2 - Play Store (Pro):**
- Usare Capacitor per generare app nativa
- Pubblicare su Play Store

---

## 🛡️ Sicurezza Pre-Deployment

### 1. Proteggere Credenziali

**NON fare:**
```javascript
// ❌ MALE - Esposto in repo
const API_KEY = "abc123def456"; // Visibile a chiunque!
```

**Fare:**
```javascript
// ✅ BENE - Usare Environment Variables
const API_KEY = process.env.REACT_APP_API_KEY;
```

In `ristruttura-app`, le credenziali sono già protette in:
```
js/config/supabaseConfig.js
```

Sulle piattaforme (Vercel/Netlify), le env variables sono cifrate.

### 2. Row Level Security (RLS) su Supabase

✅ **Già configurato nel schema:**
```sql
CREATE POLICY "Users can see their own progetti"
  ON progetti FOR SELECT
  USING (user_id = auth.uid());
```

Questo garantisce che ogni utente vede solo i propri dati.

### 3. HTTPS Automatico

✅ **Vercel/Netlify/Firebase** forniscono HTTPS automaticamente con Let's Encrypt

---

## 📊 Monitoring & Analytics

### Aggiungere Google Analytics

Aggiungi a `index.html` prima di `</body>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

Sostituisci `GA_MEASUREMENT_ID` con il tuo ID da Google Analytics.

### Monitoring Supabase

1. Vai a https://app.supabase.com → Project
2. Clicca **"Logs"** per vedere errori
3. Clicca **"Database"** → **"Connections"** per monitorare performance
4. Imposta **"Alerts"** per notifiche di problemi

---

## 🚀 RIASSUNTO: Passi da Fare Adesso

### **OGGI - Quick Start (10 minuti)**

1. **Opzione A: Vercel (CONSIGLIATO)**
   ```bash
   # Prepara Git
   git init
   git add .
   git commit -m "RistrutturaApp v1.0.0"
   
   # Vai su https://github.com/new
   # Crea repository "ristruttura-app"
   # Carica il codice
   
   # Vai su https://vercel.com
   # Importa il progetto da GitHub
   # Deploy automatico in ~1 minuto
   ```

2. **Opzione B: Netlify**
   ```bash
   # Stessi step di Vercel, ma usa netlify.com
   ```

### **SETTIMANA 1 - Ottimizzazione (2-3 ore)**

- [ ] Testare app in produzione
- [ ] Configurare dominio personalizzato
- [ ] Aggiungere Google Analytics
- [ ] Ottimizzare performance (Lighthouse)
- [ ] Scrivere privacy policy e terms of service

### **SETTIMANA 2 - Monetizzazione (opzionale)**

- [ ] Aggiungere piano Premium (su Supabase)
- [ ] Implementare pagamenti (Stripe/PayPal)
- [ ] Aggiungere subscription management

### **SETTIMANA 3 - App Store (opzionale)**

- [ ] Usare Capacitor per generare app nativa
- [ ] Pubblicare su Play Store ($25 una volta)
- [ ] Pubblicare su App Store ($99/anno)

---

## 📞 Supporto & Troubleshooting

### Errore: "CORS policy blocked"
**Soluzione:** Aggiungere dominio a Supabase Settings → CORS

### Errore: "Supabase client not initialized"
**Soluzione:** Verificare che le env variables siano caricate correttamente

### App lenta in produzione
**Soluzione:**
- Usare Lighthouse (F12 → Lighthouse) per diagnostica
- Minify CSS/JS (Vercel lo fa automaticamente)
- Usare CDN per assets statici

### Login non funziona
**Soluzione:**
- Verificare che Supabase Auth sia abilitato
- Controllare console (F12) per errori
- Verificare credenziali in config

---

## ✅ Conclusione

**Stato:** App pronta per produzione ✅

Scegli una piattaforma (Vercel consigliato) e deployala in **meno di 5 minuti**!

Dopo il deployment iniziale, puoi:
- Aggiungere domini personalizzati
- Configurare analytics
- Monitorare performance
- Aggiungere funzionalità premium

**Buon deployment!** 🚀
