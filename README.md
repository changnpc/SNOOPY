# SNOOPY — ระบบจัดการนักกีฬาบริดจ์เยาวชนทีมชาติ

**System for National Organization and Optimized Practice of Youth**
เวอร์ชัน 1.0.0 · พัฒนาโดย Nattapong PIMPISAN

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 17 + SCSS |
| Backend | Node.js 20 + Express + TypeScript |
| Database | Google Sheets (via Service Account) |
| Storage | Google Drive |
| Auth | Google OAuth 2.0 + JWT |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## โครงสร้างโปรเจกต์

```
Youth_Bridge_Team_Platform/
├── snoopy-frontend/          # Angular 17
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/         # Services, Guards, Interceptors, Base classes
│   │   │   ├── features/     # Pages: dashboard, athletes, calendar, ...
│   │   │   ├── models/       # TypeScript interfaces
│   │   │   └── shared/       # Sidebar, Topbar, Pipes, SharedModule
│   │   └── environments/
│   ├── nginx.conf
│   └── Dockerfile
├── snoopy-backend/           # Express + TypeScript
│   ├── src/
│   │   ├── config/           # env config, sheets config, swagger
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/        # Auth, RBAC, upload, rate limit, error handler
│   │   ├── routes/           # Express routers
│   │   ├── services/         # Google Sheets/Drive helpers, base repository
│   │   └── main.ts           # Entry point
│   ├── scripts/
│   │   └── loadtest.js       # Traffic test (50 concurrent users)
│   ├── Dockerfile
│   └── Dockerfile.dev
├── credentials/              # (git-ignored) service-account.json
├── .env                      # (git-ignored) ค่าจริง
├── .env.example              # Template
├── docker-compose.yml        # Production (Docker)
└── docker-compose.dev.yml    # Development
```

---

## Roles & สิทธิ์การใช้งาน

| Feature | Super Admin | Coach | Player |
|---|:---:|:---:|:---:|
| ดู/จัดการนักกีฬา | ✅ ทุกทีม | ✅ ทีมตัวเอง | ✅ ตัวเอง |
| บันทึกการเข้าซ้อม | ✅ | ✅ | ❌ |
| ยืนยัน/ปฏิเสธการลา | ✅ | ✅ | ❌ |
| แจ้งลา | ✅ | ✅ | ✅ |
| จัดการ Calendar | ✅ | ✅ (เฉพาะตัวเอง) | ❌ |
| จัดการกิจกรรม (Feed) | ✅ | ❌ | ❌ |
| จัดการลิงก์ซ้อม | ✅ | ❌ | ❌ |
| ดูลิงก์ซ้อม | ✅ | ✅ | ✅ (player link) |
| จัดการทีม / ผู้ใช้ | ✅ | ❌ | ❌ |

---

## ตั้งค่าก่อนรัน

### 1. Google Cloud (ครั้งแรกครั้งเดียว)

ดูคู่มือละเอียดได้ที่ [GOOGLE_CLOUD_SETUP.md](GOOGLE_CLOUD_SETUP.md)

สรุปขั้นตอน:
1. สร้าง Project ใน [Google Cloud Console](https://console.cloud.google.com)
2. เปิด APIs: **Google Sheets API**, **Google Drive API**
3. สร้าง **Service Account** → ดาวน์โหลด JSON key
4. สร้าง **OAuth 2.0 Client ID** (Web Application)
5. สร้าง Google Spreadsheet → แชร์ให้ Service Account email เป็น Editor
6. สร้าง Google Drive Folder → แชร์ให้ Service Account เป็น Editor

Sheet tabs (ชื่อต้องตรงตามนี้):
```
teams | users | attendance | leave_requests | events | activities | practice_links | notifications | audit_log
```

### 2. ตั้งค่า .env

```bash
cp .env.example .env
# แก้ค่าทุกตัวใน .env ตามคำแนะนำใน .env.example
```

---

## รันในโหมด Development

```bash
# 1. ติดตั้ง dependencies
cd snoopy-frontend && npm install
cd ../snoopy-backend && npm install

# 2. รัน Backend
cd snoopy-backend && npm run dev
# หรือผ่าน Docker
docker compose -f docker-compose.dev.yml up

# 3. รัน Frontend (terminal ใหม่)
cd snoopy-frontend && npm start
# เปิด http://localhost:4200
```

---

## Deploy บน Vercel + Railway (แนะนำ — ฟรี)

### Backend → Railway

1. สมัคร [railway.app](https://railway.app) → Login with GitHub
2. **New Project** → Deploy from GitHub → เลือก repo → root: `snoopy-backend`
3. ตั้ง Environment Variables ทั้งหมดใน Railway Dashboard
4. แปลง `service-account.json` เป็น base64 แล้วใส่ใน `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64`

```bash
base64 -i credentials/service-account.json | tr -d '\n'
```

### Frontend → Vercel

1. สมัคร [vercel.com](https://vercel.com) → Login with GitHub
2. **New Project** → เลือก repo
   - Root Directory: `snoopy-frontend`
   - Build Command: `npm run build -- --configuration production`
   - Output Directory: `dist/snoopy-frontend/browser`
3. Deploy

### หลัง Deploy — เชื่อม URL

อัปเดตใน Railway Variables:
```
CORS_ORIGIN=https://<your-app>.vercel.app
GOOGLE_REDIRECT_URI=https://<your-app>.vercel.app/login
```

อัปเดตใน Google Cloud Console (OAuth 2.0 Client):
- Authorized redirect URIs → `https://<your-app>.vercel.app/login`
- Authorized JavaScript origins → `https://<your-app>.vercel.app`

---

## Deploy ด้วย Docker (Self-hosted)

```bash
# ตรวจสอบ .env และ credentials/service-account.json ก่อน
docker compose up -d --build

# ดู logs
docker compose logs -f

# หยุด
docker compose down
```

| Service | URL |
|---|---|
| Frontend | http://localhost |
| Backend API | http://localhost/api |
| Health Check | http://localhost/api/health |

---

## Load Test (50 concurrent users)

```bash
# ต้องการ JWT token ก่อน (login แล้ว copy จาก DevTools)
node snoopy-backend/scripts/loadtest.js \
  --url https://<backend-url>/api \
  --token <jwt-token> \
  --users 50

# Pass criteria: error rate < 1%, p95 latency < 1000ms
```

---

## API Endpoints หลัก

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/auth/google` | เริ่ม OAuth login |
| `POST` | `/api/auth/google/callback` | แลก code รับ JWT |
| `GET` | `/api/auth/me` | ข้อมูลผู้ใช้ปัจจุบัน |
| `GET` | `/api/teams` | รายชื่อทีม |
| `GET/POST` | `/api/users` | จัดการผู้ใช้ |
| `GET/POST` | `/api/attendance` | บันทึกการเข้าซ้อม |
| `POST` | `/api/attendance/bulk` | บันทึกหลายคนพร้อมกัน |
| `GET/POST` | `/api/leave` | คำขอลา |
| `PATCH` | `/api/leave/:id/approve` | อนุมัติการลา |
| `GET/POST` | `/api/events` | ปฏิทินกิจกรรม |
| `GET/POST` | `/api/activities` | ข่าวสาร/กิจกรรม |
| `GET/POST` | `/api/practice-links` | ลิงก์ซ้อม |
| `GET` | `/api/practice-links/history` | ประวัติลิงก์ซ้อม |
| `GET` | `/api/notifications/my` | การแจ้งเตือน |

---

## Security

- `.env` และ `credentials/` อยู่ใน `.gitignore` — **ห้าม commit เด็ดขาด**
- JWT expires 8 ชั่วโมง
- Rate limiting: 300 req/min ทั่วไป, 20 req/min สำหรับ `/api/auth`
- Helmet.js headers, CORS whitelist, compression
- Trust proxy สำหรับ rate limiting แม่นยำหลัง nginx/Railway proxy
- ไม่มี stack trace ใน production error responses

---

© 2026 Nattapong PIMPISAN · pimpisan.cblt@gmail.com
