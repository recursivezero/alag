import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

export const db = await mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'recursive'
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NULL,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'email',
    google_sub VARCHAR(255) UNIQUE NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`)

const [userColumns]: any = await db.execute(`
  SELECT COLUMN_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
`)

const existingColumns = new Set(userColumns.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME))

if (!existingColumns.has('auth_provider')) {
  await db.execute("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'email'")
}

if (!existingColumns.has('google_sub')) {
  await db.execute('ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) UNIQUE NULL')
}

if (existingColumns.has('password')) {
  await db.execute('ALTER TABLE users MODIFY password VARCHAR(255) NULL')
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
  )
`)

await db.execute(`
  CREATE TABLE IF NOT EXISTS pending_registrations (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`)
