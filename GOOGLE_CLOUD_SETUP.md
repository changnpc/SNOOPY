# Google Cloud Setup Guide — NYBAMS

คู่มือการตั้งค่า Google Cloud สำหรับระบบ NYBAMS ทำตามขั้นตอนตามลำดับ

---

## ขั้นตอนที่ 1 — สร้าง Google Cloud Project

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. คลิก **Select a project** → **New Project**
3. ตั้งชื่อ Project เช่น `nybams-production`
4. คลิก **Create**

---

## ขั้นตอนที่ 2 — เปิดใช้งาน APIs

ไปที่ **APIs & Services → Library** แล้วเปิดใช้งาน:

- ✅ **Google Sheets API**
- ✅ **Google Drive API**
- ✅ **Google OAuth 2.0** (เปิดอยู่แล้วโดยค่าเริ่มต้น)

---

## ขั้นตอนที่ 3 — สร้าง OAuth 2.0 Client

1. ไปที่ **APIs & Services → Credentials**
2. คลิก **Create Credentials → OAuth client ID**
3. ถ้ายังไม่ได้ตั้งค่า Consent Screen ให้คลิก **Configure Consent Screen**
   - User Type: **External**
   - App name: `NYBAMS`
   - Support email: อีเมลของคุณ
   - Authorized domains: โดเมนที่ใช้ deploy
   - Scopes เพิ่ม: `openid`, `email`, `profile`
4. กลับมาสร้าง OAuth Client:
   - Application type: **Web application**
   - Name: `NYBAMS Web Client`
   - Authorized JavaScript origins:
     ```
     http://localhost:4200
     https://yourdomain.com
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:4200/login
     https://yourdomain.com/login
     ```
5. คลิก **Create** จะได้ **Client ID** และ **Client Secret**
6. บันทึกทั้งสองค่าไว้ใน `.env`

---

## ขั้นตอนที่ 4 — สร้าง Service Account

Service Account ใช้สำหรับให้ Backend อ่าน/เขียน Google Sheets และ Drive

1. ไปที่ **APIs & Services → Credentials**
2. คลิก **Create Credentials → Service Account**
3. ตั้งชื่อ: `nybams-backend`
4. คลิก **Done**
5. คลิกที่ Service Account ที่เพิ่งสร้าง
6. ไปที่ Tab **Keys → Add Key → Create new key**
7. เลือก **JSON** → **Create**
8. ไฟล์ JSON จะดาวน์โหลดมา — **เก็บไว้อย่างปลอดภัย**
9. เปลี่ยนชื่อไฟล์เป็น `service-account.json`
10. วางไฟล์ไว้ที่: `credentials/service-account.json`

> ⚠️ **ห้ามอัปโหลด service-account.json ขึ้น Git เด็ดขาด**

---

## ขั้นตอนที่ 5 — สร้าง Google Sheets (ฐานข้อมูล)

1. ไปที่ [Google Sheets](https://sheets.google.com) แล้วสร้าง Spreadsheet ใหม่
2. ตั้งชื่อ: `NYBAMS Database`
3. สร้าง Sheet 9 แผ่น (tabs) ตามนี้:

| Sheet Name       | คอลัมน์แรก (Row 1 = Header) |
|-----------------|---------------------------|
| `teams`          | team_id, team_name, description, is_active, created_at, updated_at |
| `users`          | user_id, google_sub, email, role, team_id, img_avatar_url, th_prefix, en_prefix, th_first_name, en_first_name, th_last_name, en_last_name, phone, birth_date, is_active, created_at, updated_at, created_by |
| `attendance`     | attendance_id, date, player_id, team_id, status, note, checked_by, checked_at, updated_at |
| `leave_requests` | leave_id, player_id, team_id, start_date, end_date, reason, evidence_url, status, reject_reason, action_by, action_at, created_at, updated_at |
| `events`         | event_id, title, description, start_datetime, end_datetime, is_all_day, color, team_id, created_by, created_at, updated_at |
| `activities`     | activity_id, title, date_from, date_to, location, details, img_url, created_by, created_at, updated_at |
| `practice_links` | link_id, practice_date, team_id, section, player_link, coach_link, note, is_archived, created_by, created_at, updated_at |
| `notifications`  | notification_id, user_id, type, title, message, ref_id, is_read, created_at |
| `audit_log`      | log_id, user_id, action, target_table, target_id, old_value, new_value, ip_address, created_at |

4. คัดลอก **Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```
5. บันทึกค่าไว้ใน `.env` เป็น `GOOGLE_SHEETS_SPREADSHEET_ID`

---

## ขั้นตอนที่ 6 — แชร์ Google Sheets ให้ Service Account

1. เปิด Google Sheets ที่เพิ่งสร้าง
2. คลิก **Share**
3. ใส่ Email ของ Service Account (อยู่ในไฟล์ JSON ที่ดาวน์โหลดมา field `client_email`)
   - ตัวอย่าง: `nybams-backend@nybams-production.iam.gserviceaccount.com`
4. Permission: **Editor**
5. คลิก **Send**

---

## ขั้นตอนที่ 7 — สร้าง Google Drive Folder

1. ไปที่ [Google Drive](https://drive.google.com)
2. สร้างโฟลเดอร์ชื่อ `NYBAMS-Storage`
3. ภายในสร้างโฟลเดอร์ย่อย 3 อัน:
   - `avatars`
   - `leave-evidence`
   - `activity-images`
4. แชร์โฟลเดอร์ `NYBAMS-Storage` ให้ Service Account เหมือนกัน (Editor)
5. คัดลอก **Folder ID** จาก URL ของโฟลเดอร์:
   ```
   https://drive.google.com/drive/folders/{FOLDER_ID}
   ```
6. บันทึกไว้ใน `.env` เป็น `GOOGLE_DRIVE_ROOT_FOLDER_ID`

---

## ขั้นตอนที่ 8 — เพิ่ม Super Admin คนแรก

1. เปิด Google Sheets → Sheet `users`
2. เพิ่ม Row แรก:
   ```
   U20260530XXXX | | your@gmail.com | Super Admin | | | นาย | Mr. | ชื่อ | FirstName | นามสกุล | LastName | | | TRUE | 2026-05-30T00:00:00 | 2026-05-30T00:00:00 |
   ```
3. ช่อง `email` ต้องตรงกับ Gmail ที่ใช้ login

---

## ขั้นตอนที่ 9 — ใส่ค่าใน .env

```bash
cp .env.example .env
# แล้วแก้ไขค่าต่างๆ ด้วย editor ที่ต้องการ
nano .env
```

ค่าที่ต้องใส่:
```env
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_SHEETS_SPREADSHEET_ID=xxxx
GOOGLE_DRIVE_ROOT_FOLDER_ID=xxxx
JWT_SECRET=สร้าง random string ยาวอย่างน้อย 32 ตัวอักษร
```

สร้าง JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## ขั้นตอนที่ 10 — ทดสอบ

```bash
# Development
cd nybams-backend
npm run dev

# ทดสอบ health check
curl http://localhost:3000/api/health
# ควรได้: {"status":"ok","timestamp":"...","version":"2.0.0"}
```
