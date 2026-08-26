# Deploy Checklist — Football Live

Repo: https://github.com/khael6690/football-schedule

## 1. MongoDB Atlas Setup

1. Buat cluster: https://cloud.mongodb.com/
2. Create Database User → username + password (simpan)
3. Network Access → Add IP Address → `0.0.0.0/0` (allow all, atau whitelist Render/Railway IP)
4. Get connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/soccer?retryWrites=true&w=majority
   ```
5. Simpan untuk env vars backend

## 2. football-data.org API Key

1. Daftar: https://www.football-data.org/client/register
2. Cek email untuk API token
3. Free tier: 10 requests/min, 100/day
4. Simpan untuk env vars backend

## 3. Deploy Backend (Render atau Railway)

### Option A: Render

1. Login https://dashboard.render.com/
2. New → Web Service
3. Connect GitHub repo: `khael6690/football-schedule`
4. Settings:
   - **Name**: `football-live-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Environment Variables (Add):
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URL=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/soccer
   FOOTBALL_DATA_API_KEY=<your_api_key>
   CORS_ORIGINS=https://<your-frontend-domain>.vercel.app
   PUBLIC_SITE_URL=https://football-live-api.onrender.com
   API_URL=https://football-live-api.onrender.com
   ENABLE_SWAGGER=true
   ```
6. Deploy
7. Setelah deploy, jalankan seed data (via Render Shell atau lokal dengan production MONGODB_URL):
   ```bash
   npm run fetcher:seed
   ```
8. Cek health: `https://football-live-api.onrender.com/health`
9. Setup Render Cron Job untuk live fetcher:
   - New → Cron Job
   - Connect same repo
   - Root Directory: `backend`
   - Command: `npm run fetcher:live`
   - Schedule: `*/5 * * * *` (every 5 min)

### Option B: Railway

1. Login https://railway.app/
2. New Project → Deploy from GitHub repo
3. Select `khael6690/football-schedule`
4. Settings:
   - **Root Directory**: `/backend`
   - **Start Command**: `npm start`
5. Variables (same as Render above, adjust CORS_ORIGINS and URLs)
6. Deploy
7. Add MongoDB plugin dari Railway marketplace atau use external Atlas
8. Seed data via Railway CLI:
   ```bash
   railway run npm run fetcher:seed
   ```
9. Setup cron (Railway doesn't have native cron — use external cron-job.org or GitHub Actions)

## 4. Deploy Frontend (Vercel)

1. Login https://vercel.com/
2. Import Project → GitHub: `khael6690/football-schedule`
3. Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: (auto-detected)
   - **Output Directory**: (auto-detected)
4. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://football-live-api.onrender.com
   ```
   (atau Railway URL jika pakai Railway)
5. Deploy
6. Domain akan dapat: `https://football-schedule-<random>.vercel.app`
7. Update backend CORS_ORIGINS di Render/Railway dengan domain Vercel ini

## 5. Update GitHub Secrets (untuk CI/CD)

Jika mau pakai `.github/workflows/deploy.yml`:

1. GitHub repo → Settings → Secrets and variables → Actions
2. Add secrets:
   - `RENDER_DEPLOY_WEBHOOK_BACKEND`: Deploy hook URL dari Render (Settings → Deploy Hook)
   - `VERCEL_TOKEN`: Personal Access Token dari Vercel (Account Settings → Tokens)
3. Push ke `main` akan trigger deploy otomatis

## 6. Post-Deploy Verification

### Backend Health Check
```bash
curl https://football-live-api.onrender.com/health
curl https://football-live-api.onrender.com/get/soccer/leagues
```

Expected: JSON response dengan 6 liga.

### Frontend
1. Buka `https://football-schedule-<random>.vercel.app/`
2. Check:
   - Landing page load
   - Top Leagues render dengan logo
   - `/leagues` → 6 liga
   - `/fixtures` → match list
   - `/standings/eng.1` → tabel liga
   - Search (Cmd+K) berfungsi
   - Dark/light toggle berfungsi

### Data Refresh
Cek Render Cron Job logs atau setup external cron untuk jalankan fetcher setiap 5 menit.

## 7. Optional: Custom Domain

### Vercel (Frontend)
1. Vercel Project → Settings → Domains
2. Add custom domain (e.g., `footballlive.yourdomain.com`)
3. Update DNS CNAME ke Vercel

### Render (Backend)
1. Render Service → Settings → Custom Domains
2. Add domain (e.g., `api.footballlive.yourdomain.com`)
3. Update DNS CNAME

### Update CORS
Setelah custom domain, update `CORS_ORIGINS` di backend env vars.

## 8. Monitoring

- **Render**: Dashboard → Logs (real-time)
- **Vercel**: Project → Deployments → Function Logs
- **MongoDB Atlas**: Metrics → Monitor connections & operations

## 9. Cost Estimate (Free Tier)

| Service | Free Tier | Notes |
|---------|-----------|-------|
| MongoDB Atlas | 512 MB storage | Enough untuk ~100k matches |
| football-data.org | 10 req/min, 100/day | Cukup untuk 6 liga setiap 5 min |
| Render | 750 hours/month | Backend + Cron Job |
| Vercel | Unlimited deployments | 100 GB bandwidth/month |

**Total**: $0/month untuk MVP.

## 10. Troubleshooting

### "Failed to connect to MongoDB"
- Check `MONGODB_URL` format (no trailing slash, correct database name)
- Verify IP whitelist di Atlas (use `0.0.0.0/0` untuk test)

### "API returns empty data"
- Run `npm run fetcher:seed` di backend
- Check backend logs untuk fetch errors
- Verify `FOOTBALL_DATA_API_KEY` valid

### CORS errors di frontend
- Update `CORS_ORIGINS` di backend env vars dengan exact Vercel domain
- Restart backend setelah env change

### Render free tier sleeps after 15min inactivity
- First request after sleep takes ~30s (cold start)
- Upgrade ke paid tier ($7/month) untuk always-on
- Atau setup uptime monitor (uptimerobot.com) ping setiap 5 min

---

**Deployment Status**: Ready to deploy 🚀

**Next Steps**:
1. Create MongoDB Atlas cluster
2. Get football-data.org API key
3. Deploy backend to Render
4. Seed data via `npm run fetcher:seed`
5. Deploy frontend to Vercel
6. Verify all pages load correctly
