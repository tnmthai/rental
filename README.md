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
  user_id BIGINT,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  price_nzd_week INT NOT NULL,
  source_url TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  furnished BOOLEAN NOT NULL DEFAULT false,
  bills_included BOOLEAN NOT NULL DEFAULT false,
  near_school TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- migrate from old versions
ALTER TABLE listings ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS furnished BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bills_included BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS near_school TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  provider_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_provider_idx ON users(provider, provider_id);

ALTER TABLE listings
  ADD CONSTRAINT listings_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS saved_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  - `NEXTAUTH_URL` (e.g. `https://your-app.up.railway.app`)
  - `NEXTAUTH_SECRET` (random long string)
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `FACEBOOK_CLIENT_ID`
  - `FACEBOOK_CLIENT_SECRET`
  - `ADMIN_EMAILS` (comma-separated admin emails for moderation page)
  - `OPENAI_API_KEY` (optional, enables AI-assisted query parsing)
  - `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
  - `OPENAI_BASE_URL` (optional for OpenRouter/compatible providers)
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Build command: `npm run build`
- Start command: `npm run start`

## 5) API endpoints

- `POST /api/chat` → chat-based filter search
- `GET /api/listings` → list recent listings
- `POST /api/listings` → create listing
- `POST /api/upload` → upload multiple images to local filesystem (legacy/test)
- `POST /api/upload-cloudinary` → upload multiple images to Cloudinary (recommended)

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
