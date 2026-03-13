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
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO listings (title, city, price_nzd_week, source_url)
VALUES
  ('Room near AUT CBD', 'Auckland', 240, 'https://example.com/aut-room-1'),
  ('Shared flat near UoA', 'Auckland', 230, 'https://example.com/uoa-room-2'),
  ('Student room in Riccarton', 'Christchurch', 210, 'https://example.com/chch-room-1')
ON CONFLICT DO NOTHING;
```

## 4) Railway deploy

- Connect repo
- Set env vars:
  - `DATABASE_URL` (from Railway Postgres)
  - `NODE_ENV=production`
- Build command: `npm run build`
- Start command: `npm run start`

