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
  furnished BOOLEAN NOT NULL DEFAULT false,
  bills_included BOOLEAN NOT NULL DEFAULT false,
  near_school TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- for old table from v1
ALTER TABLE listings ADD COLUMN IF NOT EXISTS furnished BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS bills_included BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS near_school TEXT;

TRUNCATE TABLE listings RESTART IDENTITY;

INSERT INTO listings (title, city, price_nzd_week, source_url, furnished, bills_included, near_school)
VALUES
  ('Room near AUT CBD', 'Auckland', 240, 'https://example.com/aut-room-1', true, true, 'AUT'),
  ('Shared flat near UoA', 'Auckland', 230, 'https://example.com/uoa-room-2', true, false, 'UoA'),
  ('Student room in Riccarton', 'Christchurch', 210, 'https://example.com/chch-room-1', false, true, null);
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

Basic in-memory rate limit is enabled for chat + listing submit routes.
