ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS identifier VARCHAR(255) NULL AFTER email,
  ADD COLUMN IF NOT EXISTS type       VARCHAR(10)  NOT NULL DEFAULT 'email' AFTER identifier,
  ADD COLUMN IF NOT EXISTS verified   BOOLEAN      NOT NULL DEFAULT FALSE AFTER otp;

UPDATE otp_codes SET identifier = email WHERE identifier IS NULL;


CREATE INDEX IF NOT EXISTS idx_identifier_type ON otp_codes (identifier, type);


ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS mobile          VARCHAR(30)  NULL          AFTER password,
  ADD COLUMN IF NOT EXISTS email_verified  BOOLEAN      NOT NULL DEFAULT FALSE AFTER mobile,
  ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN      NOT NULL DEFAULT FALSE AFTER email_verified;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER is_verified;