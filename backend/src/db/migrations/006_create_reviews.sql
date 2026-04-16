CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) UNIQUE,
  buyer_id      UUID NOT NULL REFERENCES users(id),
  product_id    UUID NOT NULL REFERENCES products(id),
  rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
