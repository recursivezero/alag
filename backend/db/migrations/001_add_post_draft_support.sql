USE alag;

ALTER TABLE posts
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'published'
AFTER feed_type;

ALTER TABLE posts
ADD COLUMN updated_at TIMESTAMP
NOT NULL
DEFAULT CURRENT_TIMESTAMP
ON UPDATE CURRENT_TIMESTAMP
AFTER created_at;

UPDATE posts
SET status = 'published'
WHERE status IS NULL OR status = '';

ALTER TABLE posts
ADD INDEX idx_status (status);

ALTER TABLE posts
ADD INDEX idx_user_status (user_id, status);