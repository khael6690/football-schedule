# Plan Penyesuaian FootballLive

## 1. Kondisi Project Saat Ini

Project sudah memiliki:

- Frontend: Next.js
- Backend: Express.js
- Deployment frontend: Vercel
- Provider data saat ini: football-data.org
- Belum menggunakan Redis
- Website: https://football-schedule-psi.vercel.app

Aplikasi saat ini sudah memiliki konsep:

- FootballLive
- Jadwal pertandingan
- Live Scores
- Fixtures
- Leagues
- Standings
- Konversi waktu pertandingan ke WIB

Jangan mengubah UI/UX yang sudah ada tanpa alasan teknis yang jelas.

## 2. Masalah Saat Ini

football-data.org Free digunakan sebagai provider utama, tetapi Free Plan memiliki delayed scores/schedules dan tidak menyediakan live score real-time.

Karena itu diperlukan provider tambahan untuk live data.

Provider tambahan yang digunakan:

API-Football.

API-Football Free saat ini menyediakan:

- Livescore
- Fixtures
- Events
- Lineups
- Statistics
- Standings
- Teams
- dan endpoint football lainnya

Namun Free Plan hanya memiliki 100 requests/day.

Karena itu API-Football TIDAK BOLEH dipanggil langsung dari frontend dan TIDAK BOLEH dipolling oleh setiap visitor.

## 3. Tujuan Arsitektur

Pertahankan football-data.org sebagai provider data existing.

Tambahkan API-Football sebagai provider khusus live data.

Tambahkan Redis sebagai caching layer.

Arsitektur target:

Next.js
    ↓
Express.js API
    ↓
Redis
    ↓
Provider Layer
    ├── football-data.org
    └── API-Football

Frontend hanya boleh berkomunikasi dengan Express.js.

API key provider tidak boleh pernah dikirim ke browser.

## 4. Tahap 1 — Audit Project

SEBELUM mengubah kode:

1. Scan struktur frontend Next.js.
2. Scan struktur backend Express.js.
3. Identifikasi semua endpoint Express yang saat ini digunakan frontend.
4. Identifikasi semua pemanggilan football-data.org.
5. Identifikasi model/shape data match yang digunakan frontend.
6. Identifikasi halaman:
   - homepage
   - live score
   - fixtures
   - league
   - standings
   - match detail
7. Identifikasi apakah sudah terdapat polling atau refresh otomatis.
8. Identifikasi environment variables existing.
9. Identifikasi deployment backend.
10. Jangan menghapus atau mengganti existing implementation sebelum memahami dependensinya.

Setelah audit, tampilkan ringkasan struktur project dan rencana perubahan sebelum melakukan refactor besar.

## 5. Tahap 2 — Tambahkan Redis

Gunakan Upstash Redis.

Package:

@upstash/redis

Environment variable:

UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

Buat Redis abstraction/service sehingga kode aplikasi tidak memanggil Redis secara langsung di seluruh project.

Contoh:

services/cacheService.js

atau mengikuti struktur existing project jika struktur berbeda.

Cache service minimal harus mendukung:

- get
- set
- delete
- exists
- TTL
- optional JSON serialization

Jangan membuat Redis menjadi database utama.

Redis digunakan sebagai cache dan temporary live state.

## 6. Tahap 3 — Provider Abstraction

Buat provider abstraction.

Contoh struktur:

providers/
    footballDataProvider
    apiFootballProvider

Buat service layer:

services/
    matchService
    liveScoreService
    standingsService
    cacheService

Jangan menempatkan logic API-Football langsung di route/controller.

## 7. football-data.org

Pertahankan football-data.org untuk data existing yang sudah berjalan dengan baik:

- fixtures
- schedules
- standings
- competitions
- historical/basic results

Jangan mengganti provider existing secara total.

Tambahkan caching agar request tidak dilakukan setiap kali frontend meminta data.

Flow:

Frontend
    ↓
Express
    ↓
Redis
    ├── cache HIT → return Redis
    │
    └── cache MISS
            ↓
      football-data.org
            ↓
         Redis SET
            ↓
         response

## 8. API-Football

Gunakan API:

https://v3.football.api-sports.io

Authentication menggunakan:

x-apisports-key

API key hanya berada di backend environment variable:

API_FOOTBALL_KEY

Jangan pernah expose API_FOOTBALL_KEY ke frontend.

## 9. API-Football Live Endpoint

Gunakan:

GET /fixtures?live=all

Untuk live score.

Jika memungkinkan filter hanya kompetisi yang diperlukan menggunakan league IDs.

Prioritaskan:

- Premier League
- La Liga
- Serie A
- Bundesliga
- Ligue 1
- Champions League

Jangan mengambil seluruh data live dunia jika tidak diperlukan.

API-Football menyatakan data fixtures/events diperbarui sekitar setiap 15 detik, tetapi Free Plan hanya memiliki 100 requests/day.

Karena itu jangan menerapkan polling 15 detik secara membabi buta.

## 10. Request Budget

Anggap quota API-Football Free:

100 requests/day.

Buat API request budget/guard.

Backend harus membaca response headers API-Football jika tersedia:

- x-ratelimit-requests-limit
- x-ratelimit-requests-remaining
- X-RateLimit-Limit
- X-RateLimit-Remaining

Jika quota mendekati habis:

- jangan melakukan request tambahan yang tidak penting
- gunakan data Redis terakhir
- return cached data
- log warning

Jangan sampai seluruh service terus melakukan request setelah quota habis.

## 11. Live Polling Strategy

Jangan melakukan polling live 24 jam.

Buat Live Score Worker/Service.

Logika:

1. Cek apakah terdapat pertandingan yang berpotensi live.
2. Jika tidak ada:
   - jangan polling API-Football secara agresif.
3. Jika ada pertandingan:
   - request API-Football.
4. Filter hanya liga yang diperlukan.
5. Simpan hasil ke Redis.
6. Bandingkan hasil terbaru dengan hasil sebelumnya.
7. Jika score/event berubah:
   - update Redis
   - publish/update frontend jika SSE/WebSocket tersedia.
8. Jika semua pertandingan selesai:
   - hentikan aggressive polling.

## 12. Jangan Polling Per Match

Jangan melakukan:

for each live match:
    GET /fixtures?id=...

Gunakan endpoint live yang mengembalikan pertandingan live secara kolektif jika kebutuhan data terpenuhi.

Tujuannya adalah satu request dapat digunakan untuk banyak pertandingan.

Jika detail tambahan diperlukan, hanya request fixture tertentu yang benar-benar dibutuhkan.

## 13. Mapping ID Provider

Jangan menganggap ID football-data.org sama dengan ID API-Football.

Buat mapping internal:

football_data_match_id
api_football_fixture_id
competition
season
home_team
away_team
kickoff

Mapping dapat disimpan di database existing atau Redis sesuai kebutuhan.

Gunakan ID internal aplikasi sebagai ID yang dikonsumsi frontend.

Frontend tidak perlu mengetahui perbedaan ID provider.

## 14. Internal Match Model

Buat normalized match object.

Contoh:

{
  "id": "internal-id",
  "providers": {
    "footballData": "12345",
    "apiFootball": "987654"
  },
  "league": {
    "id": "PL",
    "name": "Premier League"
  },
  "home": {
    "name": "Arsenal",
    "logo": "..."
  },
  "away": {
    "name": "Chelsea",
    "logo": "..."
  },
  "score": {
    "home": 2,
    "away": 1
  },
  "status": "LIVE",
  "minute": 67,
  "events": []
}

Sesuaikan field dengan model existing project.

Jangan merusak contract API yang sudah digunakan frontend kecuali memang diperlukan.

## 15. Redis Key Strategy

Gunakan namespace.

Contoh:

football:matches:today
football:matches:tomorrow

football:live
football:live:PL
football:live:PD
football:live:SA
football:live:BL1
football:live:FL1
football:live:CL

football:fixture:{id}

football:standings:{league}:{season}

Tambahkan TTL sesuai jenis data.

Jangan menggunakan TTL yang sama untuk semua data.

Contoh konsep:

Live:
TTL pendek.

Fixtures:
TTL lebih panjang.

Standings:
TTL lebih panjang.

Static league/team data:
TTL sangat panjang.

## 16. Express API

Pertahankan endpoint existing jika sudah digunakan FE.

Jika diperlukan tambahkan:

GET /api/live
GET /api/live/:league

GET /api/matches/today
GET /api/matches/tomorrow
GET /api/matches/date/:date

GET /api/matches/:id
GET /api/matches/:id/events

Jangan membuat endpoint frontend langsung menuju API-Football.

## 17. Frontend Next.js

Next.js tetap menggunakan Express API.

Jangan tambahkan API-Football key ke:

NEXT_PUBLIC_*

Jangan melakukan request langsung:

https://v3.football.api-sports.io

dari browser.

Frontend cukup:

GET /api/live

atau endpoint existing yang sudah disesuaikan.

## 18. Live UI

Pertahankan desain existing.

Jika pertandingan LIVE:

- tampilkan status LIVE
- tampilkan menit pertandingan jika tersedia
- tampilkan score
- tampilkan event penting jika sudah tersedia

Contoh:

LIVE
Arsenal 2 - 1 Chelsea
67'

Event:

67' ⚽ Arsenal
54' 🟨 Chelsea
42' ⚽ Arsenal

Jangan mengubah layout secara besar-besaran kecuali memang diperlukan.

## 19. Real-Time Frontend

Implementasi awal boleh menggunakan polling terhadap Express:

Next.js
    ↓
GET /api/live
    ↓
Express
    ↓
Redis

Polling frontend tidak boleh memicu API-Football request baru setiap kali.

Lebih baik:

Frontend polling
    ↓
Express
    ↓
Redis

Untuk tahap berikutnya dapat ditingkatkan menjadi:

API-Football
    ↓
Express
    ↓
Redis
    ↓
SSE
    ↓
Next.js

SSE lebih disukai untuk update server → browser jika implementasi WebSocket belum diperlukan.

## 20. Cache-First Strategy

Untuk semua endpoint yang memungkinkan:

1. Check Redis.
2. Jika valid:
   return cached response.
3. Jika tidak:
   fetch provider.
4. Normalize response.
5. Save Redis.
6. Return response.

Jangan melakukan provider request hanya karena ada visitor baru.

## 21. Error Handling

Jika API-Football gagal:

- jangan membuat frontend error total
- gunakan cached response terakhir jika tersedia
- tambahkan metadata:

{
  "source": "cache",
  "stale": true
}

Jika Redis gagal:

- aplikasi tetap harus dapat menggunakan provider langsung sebagai fallback terbatas
- jangan membuat request berulang tanpa kontrol

Jika API quota habis:

- stop unnecessary API-Football requests
- gunakan cached live state terakhir
- log quota exhausted

## 22. Observability

Tambahkan logging minimal:

[API-FOOTBALL]
request
remaining quota
response status

[REDIS]
cache hit
cache miss
set
error

[LIVE]
active matches
last update
score changes

Jangan log API key.

## 23. Environment Variables

Backend:

FOOTBALL_DATA_API_TOKEN=...

API_FOOTBALL_KEY=...

UPSTASH_REDIS_REST_URL=...

UPSTASH_REDIS_REST_TOKEN=...

Frontend hanya menerima environment variable yang memang aman untuk public.

Jangan menggunakan NEXT_PUBLIC_API_FOOTBALL_KEY.

## 24. Testing

Sebelum deploy:

1. Test football-data.org existing endpoints.
2. Test API-Football authentication.
3. Test Redis connection.
4. Test cache HIT.
5. Test cache MISS.
6. Test live fixture retrieval.
7. Test score update.
8. Test event update.
9. Test API quota handling.
10. Test provider failure.
11. Test Redis failure.
12. Test frontend ketika cached data tersedia.
13. Test frontend ketika tidak ada live match.
14. Test timezone WIB.
15. Test pertandingan selesai dari LIVE → FT.

## 25. Acceptance Criteria

Implementasi dianggap berhasil jika:

- Existing fixture page tetap berjalan.
- Existing standings tetap berjalan.
- Existing league page tetap berjalan.
- football-data.org tetap menjadi provider existing.
- API-Football berhasil menyediakan live score.
- API key tidak terlihat di browser.
- Redis berhasil digunakan sebagai cache.
- Banyak user tidak menyebabkan satu request API-Football per user.
- Live match tersimpan di Redis.
- Score dapat berubah tanpa refresh manual.
- Event goal/card dapat ditampilkan jika tersedia.
- Quota API-Football dikontrol.
- Tidak ada polling agresif ketika tidak ada pertandingan.
- Tidak ada breaking change pada API contract existing tanpa alasan.
- Deployment frontend Vercel tetap berjalan.
- Backend Express tetap berjalan pada environment deployment saat ini.

## 26. Urutan Implementasi

Kerjakan secara bertahap:

PHASE 1
Audit existing project.

PHASE 2
Integrasikan Upstash Redis.

PHASE 3
Pindahkan existing football-data.org response ke cache.

PHASE 4
Buat apiFootballProvider.

PHASE 5
Buat liveScoreService.

PHASE 6
Buat mapping football-data match ID ↔ API-Football fixture ID.

PHASE 7
Tambahkan endpoint /api/live.

PHASE 8
Hubungkan Next.js ke endpoint live baru.

PHASE 9
Tambahkan polling/SSE sesuai kebutuhan.

PHASE 10
Optimasi request quota.

PHASE 11
Testing.

PHASE 12
Deployment.

## 27. Aturan Penting Untuk AI

Jangan melakukan rewrite project.

Jangan mengganti framework.

Jangan mengganti UI tanpa kebutuhan.

Jangan menghapus football-data.org.

Jangan menghapus endpoint existing.

Jangan expose API key.

Jangan melakukan API-Football polling dari browser.

Jangan membuat setiap visitor memicu API-Football request.

Jangan membuat polling 15 detik tanpa mempertimbangkan quota Free Plan.

Gunakan Redis sebagai shared cache agar semua visitor menggunakan data yang sama.

Sebelum melakukan perubahan besar, inspect existing implementation terlebih dahulu.

Setelah setiap phase selesai, pastikan aplikasi masih dapat berjalan.

Prioritaskan backward compatibility.

## Target Akhir

Target akhir arsitektur:

Next.js / Vercel
        ↓
   Express.js API
        ↓
      Redis
     ↙     ↘
football-data  API-Football
     ↓            ↓
fixtures       live score
schedule       events
standings      live status
     ↘            ↙
       Normalized Data
             ↓
           Redis
             ↓
          Next.js