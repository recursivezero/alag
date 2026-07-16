USE alag;

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS alt_text VARCHAR(255) NULL AFTER location;

UPDATE posts
SET alt_text = title
WHERE alt_text IS NULL OR TRIM(alt_text) = '';

ALTER TABLE posts
MODIFY COLUMN alt_text VARCHAR(255) NOT NULL;