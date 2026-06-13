CREATE DATABASE IF NOT EXISTS `recursive`;

USE `recursive`;

CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  full_name    VARCHAR(100)  NOT NULL,
  name         VARCHAR(100)  NULL,
  email        VARCHAR(255)  UNIQUE NOT NULL,
  password     VARCHAR(255)  NULL,
  role         VARCHAR(20)   NOT NULL DEFAULT 'user',
  auth_provider VARCHAR(20)  NOT NULL DEFAULT 'email',
  google_sub   VARCHAR(255)  UNIQUE NULL,
  is_verified  BOOLEAN       DEFAULT FALSE,
  is_disabled  BOOLEAN       DEFAULT FALSE,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT            NOT NULL,
  session_hash  VARCHAR(255)   NOT NULL UNIQUE,
  remember_me   BOOLEAN        NOT NULL DEFAULT FALSE, 
  expires_at    DATETIME       NOT NULL,
  revoked_at    DATETIME       NULL,
  last_used_at  DATETIME       NULL,
  user_agent    VARCHAR(255)   NULL,
  ip_address    VARCHAR(64)    NULL,
  created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_session_hash (session_hash),
  INDEX idx_expires_at (expires_at),
  INDEX idx_revoked_at (revoked_at)
);

CREATE TABLE IF NOT EXISTS admins (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(100)  NOT NULL,
  email       VARCHAR(255)  UNIQUE NOT NULL,
  password    VARCHAR(255)  NOT NULL,
  role        VARCHAR(20)   NOT NULL DEFAULT 'admin',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  otp        VARCHAR(6)   NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS pending_registrations (
  email      VARCHAR(255) PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  event_type  VARCHAR(20)   NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
);

-- Posts table.

CREATE TABLE IF NOT EXISTS posts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  slug        VARCHAR(255)  NOT NULL UNIQUE,
  title       VARCHAR(255)  NOT NULL,
  caption     TEXT          NOT NULL,
  image_url   MEDIUMTEXT    NOT NULL,
  alt_text    VARCHAR(255)  NOT NULL,
  category    VARCHAR(100)  NULL,
  feed_type   VARCHAR(20)   NOT NULL DEFAULT 'public',
  status      VARCHAR(20)   NOT NULL DEFAULT 'published',
  location    VARCHAR(255)  NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_slug (slug),
  INDEX idx_feed_type (feed_type),
  INDEX idx_status (status),
  INDEX idx_user_status (user_id, status),
  INDEX idx_created_at (created_at)
);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  post_id     INT           NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY  uq_user_post  (user_id, post_id),
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id)
);

-- Saved posts
CREATE TABLE IF NOT EXISTS saved_posts (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT           NOT NULL,
  post_id     INT           NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY  uq_saved_user_post (user_id, post_id),
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id)
);

-- Comments on posts (visible to everyone).
CREATE TABLE IF NOT EXISTS post_comments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  post_id     INT           NOT NULL,
  user_id     INT           NOT NULL,
  body        TEXT          NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id)
);