-- QR check-in, referral program, post-event photo gallery.
-- No new enum values, safe to run as a single file.

ALTER TABLE event_participants ADD COLUMN checked_in_at timestamptz;

ALTER TABLE users
  ADD COLUMN referred_by uuid REFERENCES users(id),
  ADD COLUMN referral_reward_claimed boolean NOT NULL DEFAULT false;

CREATE TABLE event_photos (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url  text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_event_photos_event ON event_photos (event_id);
