CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES shops(id),
  fakestore_id     INTEGER UNIQUE,
  title            TEXT NOT NULL,
  description      TEXT,
  price            NUMERIC(10,2) NOT NULL CHECK (price > 0),
  image_url        TEXT,
  category         TEXT,
  stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0 AND stock <= 999999),
  aggregate_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count     INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
