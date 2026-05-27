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



