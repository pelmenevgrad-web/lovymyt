-- ============================================================
-- Дозволяє повідомленням у чаті мати фото (з галереї або селфі),
-- з підписом або без.
-- ============================================================

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE chat_messages ALTER COLUMN text DROP NOT NULL;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_text_or_image
  CHECK (text IS NOT NULL OR image_url IS NOT NULL);
