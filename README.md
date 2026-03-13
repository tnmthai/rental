# Student Rental NZ MVP (Next.js + Railway)

## 1) Env

Copy `.env.example` -> `.env` and set values.

## 2) Local run

```bash
npm i
npm run dev
```

## 3) DB schema (Postgres)

Run this SQL on Railway Postgres:

```sql
CREATE TABLE IF NOT EXISTS listings (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  price_nzd_week INT NOT NULL,
  source_url TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  furnished BOOLEAN NOT NULL DEFAULT false,
  bills_included BOOLEAN NOT NULL DEFAULT false,
  near_school TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- migrate from old versions
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS furnished BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bills_included BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS near_school TEXT;

-- optional cleanup if old single-image column exists
-- ALTER TABLE listings DROP COLUMN IF EXISTS image_url;

TRUNCATE TABLE listings RESTART IDENTITY;

INSERT INTO listings (title, city, price_nzd_week, source_url, image_urls, description, furnished, bills_included, near_school)
VALUES
  ('Room near AUT CBD', 'Auckland', 240, 'https://example.com/aut-room-1', ARRAY['/uploads/auckland/aut-room-1.jpg'], 'Sunny room near AUT, 8-minute walk.', true, true, 'AUT'),
  ('Shared flat near UoA', 'Auckland', 230, 'https://example.com/uoa-room-2', ARRAY['/uploads/auckland/uoa-room-2.jpg'], 'Great flatmate vibe, near bus stop.', true, false, 'UoA');
```

## 4) Railway deploy

- Connect repo
- Set env vars:
  - `DATABASE_URL` (from Railway Postgres)
  - `NODE_ENV=production`
- Build command: `npm run build`
- Start command: `npm run start`

## 5) API endpoints

- `POST /api/chat` → chat-based filter search
- `GET /api/listings` → list recent listings
- `POST /api/listings` → create listing
- `POST /api/upload` → upload multiple images (`multipart/form-data`, field: `images`, plus `city`)

Basic in-memory rate limit is enabled for chat + listing submit routes.

## 6) Where to upload images

### Option A (recommended now): directly in app form
- In "Đăng listing mới", pick **Upload nhiều hình ảnh** and submit.
- Images are saved to: `public/uploads/<city-slug>/...`

### Option B: upload in GitHub repo
- `public/uploads/auckland/...`
- `public/uploads/christchurch/...`
- `public/uploads/wellington/...`

Then use URL like `/uploads/auckland/room-001.jpg`.

## 7) Note for Railway

This MVP saves uploaded files to local filesystem in container (`public/uploads/...`).
For production durability, move uploads to object storage (R2/S3/Supabase Storage).
