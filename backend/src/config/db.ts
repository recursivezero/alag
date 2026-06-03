import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { hashPassword } from '../utils/hash'

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
    full_name VARCHAR(100) NOT NULL,
    name VARCHAR(100) NULL,
    phone_number VARCHAR(30) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'email',
    google_sub VARCHAR(255) UNIQUE NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_disabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`)

await db.execute(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_hash VARCHAR(255) NOT NULL UNIQUE,
    remember_me BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    last_used_at DATETIME NULL,
    user_agent VARCHAR(255) NULL,
    ip_address VARCHAR(64) NULL,
    device_name VARCHAR(100) NULL,
    browser_name VARCHAR(100) NULL,
    location VARCHAR(255) NULL,
    login_at_ist VARCHAR(64) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active Now',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_session_hash (session_hash),
    INDEX idx_expires_at (expires_at),
    INDEX idx_revoked_at (revoked_at)
  )
`)

const [userSessionColumns]: any = await db.execute(`
  SELECT COLUMN_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions'
`)

const existingUserSessionColumns = new Set(
  userSessionColumns.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME)
)

if (!existingUserSessionColumns.has('device_name')) {
  await db.execute('ALTER TABLE user_sessions ADD COLUMN device_name VARCHAR(100) NULL AFTER ip_address')
}

if (!existingUserSessionColumns.has('browser_name')) {
  await db.execute('ALTER TABLE user_sessions ADD COLUMN browser_name VARCHAR(100) NULL AFTER device_name')
}

if (!existingUserSessionColumns.has('location')) {
  await db.execute('ALTER TABLE user_sessions ADD COLUMN location VARCHAR(255) NULL AFTER browser_name')
}

if (!existingUserSessionColumns.has('login_at_ist')) {
  await db.execute('ALTER TABLE user_sessions ADD COLUMN login_at_ist VARCHAR(64) NULL AFTER location')
}

if (!existingUserSessionColumns.has('status')) {
  await db.execute("ALTER TABLE user_sessions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active Now' AFTER login_at_ist")
}

await db.execute("UPDATE user_sessions SET status = CASE WHEN revoked_at IS NULL THEN 'Active Now' ELSE 'Logged Out' END")

const [userColumns]: any = await db.execute(`
  SELECT COLUMN_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
`)

const existingColumns = new Set(userColumns.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME))

if (!existingColumns.has('auth_provider')) {
  await db.execute("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'email'")
}

if (!existingColumns.has('full_name')) {
  await db.execute('ALTER TABLE users ADD COLUMN full_name VARCHAR(100) NULL')
}

if (!existingColumns.has('role')) {
  await db.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'")
}

if (!existingColumns.has('google_sub')) {
  await db.execute('ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) UNIQUE NULL')
}

if (!existingColumns.has('is_disabled')) {
  await db.execute('ALTER TABLE users ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE')
}

if (!existingColumns.has('name')) {
  await db.execute('ALTER TABLE users ADD COLUMN name VARCHAR(100) NULL')
}

if (!existingColumns.has('username')) {
  await db.execute('ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER name')
}

if (!existingColumns.has('phone_number')) {
  await db.execute('ALTER TABLE users ADD COLUMN phone_number VARCHAR(30) NULL AFTER name')
}

if (!existingColumns.has('bio')) {
  await db.execute('ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER phone_number')
}

if (!existingColumns.has('picture')) {
  await db.execute('ALTER TABLE users ADD COLUMN picture TEXT NULL AFTER bio')
}

await db.execute('UPDATE users SET full_name = COALESCE(full_name, name) WHERE full_name IS NULL')
await db.execute('UPDATE users SET name = COALESCE(name, full_name) WHERE name IS NULL')

if (existingColumns.has('password')) {
  await db.execute('ALTER TABLE users MODIFY password VARCHAR(255) NULL')
}

await db.execute('ALTER TABLE users MODIFY full_name VARCHAR(100) NOT NULL')

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

await db.execute(`
  CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`)

const [adminColumns]: any = await db.execute(`
  SELECT COLUMN_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admins'
`)

const existingAdminColumns = new Set(
  adminColumns.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME)
)

if (!existingAdminColumns.has('full_name')) {
  await db.execute("ALTER TABLE admins ADD COLUMN full_name VARCHAR(100) NULL AFTER id")
}

if (existingAdminColumns.has('name')) {
  await db.execute('UPDATE admins SET full_name = COALESCE(full_name, name)')
  await db.execute('ALTER TABLE admins DROP COLUMN name')
}

await db.execute('ALTER TABLE admins MODIFY full_name VARCHAR(100) NOT NULL')

const [existingAdminRows]: any = await db.execute(
  'SELECT id FROM admins WHERE email = ? LIMIT 1',
  ['admin@gmail.com']
)

const defaultAdminPassword = await hashPassword('Admin@1234')

if (!existingAdminRows.length) {
  await db.execute(
    'INSERT INTO admins (full_name, email, password, role) VALUES (?, ?, ?, ?)',
    ['Admin User', 'admin@gmail.com', defaultAdminPassword, 'admin']
  )
} else {
  await db.execute(
    'UPDATE admins SET full_name = ?, password = ?, role = ? WHERE email = ?',
    ['Admin User', defaultAdminPassword, 'admin', 'admin@gmail.com']
  )
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token_hash (token_hash)
  )
`)

await db.execute(`
  CREATE TABLE IF NOT EXISTS user_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
  )
`)

await db.execute(`
  CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    caption TEXT NOT NULL,
    image_url LONGTEXT NOT NULL,
    location VARCHAR(180) NULL,
    alt_text VARCHAR(255) NULL,
    category VARCHAR(80) NULL,
    feed_type VARCHAR(20) NOT NULL DEFAULT 'public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
  )
`)

const [postColumns]: any = await db.execute(`
  SELECT COLUMN_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts'
`)

const existingPostColumns = new Set(
  postColumns.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME)
)

if (!existingPostColumns.has('alt_text')) {
  await db.execute('ALTER TABLE posts ADD COLUMN alt_text VARCHAR(255) NULL AFTER location')
}

if (!existingPostColumns.has('category')) {
  await db.execute('ALTER TABLE posts ADD COLUMN category VARCHAR(80) NULL AFTER alt_text')
}

if (!existingPostColumns.has('feed_type')) {
  await db.execute("ALTER TABLE posts ADD COLUMN feed_type VARCHAR(20) NOT NULL DEFAULT 'public' AFTER category")
}

await db.execute("UPDATE posts SET feed_type = COALESCE(feed_type, 'public')")
await db.execute("UPDATE posts SET feed_type = 'public' WHERE feed_type NOT IN ('public', 'personal')")
await db.execute('ALTER TABLE posts MODIFY image_url LONGTEXT NOT NULL')

await db.execute(`
  CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (post_id, user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id)
  )
`)

await db.execute(`
  CREATE TABLE IF NOT EXISTS saved_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_saved_post (post_id, user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id)
  )
`)

await db.execute(`
  CREATE TABLE IF NOT EXISTS post_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
  )
`)

const [existingPosts]: any = await db.execute('SELECT id FROM posts LIMIT 1')

if (!existingPosts.length) {
  const [seedUsers]: any = await db.execute(
    'SELECT id, COALESCE(full_name, name) AS name FROM users ORDER BY id ASC LIMIT 3'
  )

  if (seedUsers.length) {
    const primaryUserId = Number(seedUsers[0].id)
    const secondaryUserId = Number(seedUsers[1]?.id || seedUsers[0].id)
    const tertiaryUserId = Number(seedUsers[2]?.id || seedUsers[0].id)

    const seedPosts = [
      {
        userId: primaryUserId,
        slug: 'sunset-in-goa',
        title: 'Sunset in Goa',
        caption: 'Golden hour at the shoreline with soft waves and a neon horizon.',
        imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
        location: 'Goa, India',
      },
      {
        userId: secondaryUserId,
        slug: 'mountains-of-manali',
        title: 'Mountains of Manali',
        caption: 'Clear alpine air, dramatic peaks, and a quiet trail above the valley.',
        imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        location: 'Manali, Himachal Pradesh',
      },
      {
        userId: tertiaryUserId,
        slug: 'city-lights-after-rain',
        title: 'City Lights After Rain',
        caption: 'Reflections, traffic glow, and a moody skyline after an evening shower.',
        imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1600&q=80',
        location: 'Mumbai, Maharashtra',
      },
    ]

    for (const post of seedPosts) {
      await db.execute(
        `
        INSERT INTO posts (user_id, slug, title, caption, image_url, location)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [post.userId, post.slug, post.title, post.caption, post.imageUrl, post.location]
      )
    }

    const [seededPosts]: any = await db.execute('SELECT id, slug FROM posts ORDER BY id ASC')
    const firstPost = seededPosts.find((post: { slug: string }) => post.slug === 'sunset-in-goa') || seededPosts[0]
    const secondPost = seededPosts.find((post: { slug: string }) => post.slug === 'mountains-of-manali') || seededPosts[1]

    if (firstPost) {
      await db.execute(
        'INSERT INTO likes (post_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id',
        [firstPost.id, primaryUserId]
      )
      await db.execute(
        'INSERT INTO saved_posts (post_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id',
        [firstPost.id, primaryUserId]
      )
      await db.execute(
        'INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)',
        [firstPost.id, primaryUserId, 'The light on this one is unreal.']
      )
      await db.execute(
        'INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)',
        [firstPost.id, secondaryUserId, 'Bookmarking this for my next beach trip.']
      )
    }

    if (secondPost) {
      await db.execute(
        'INSERT INTO likes (post_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = id',
        [secondPost.id, secondaryUserId]
      )
      await db.execute(
        'INSERT INTO post_comments (post_id, user_id, body) VALUES (?, ?, ?)',
        [secondPost.id, tertiaryUserId, 'Those ridgelines are incredible.']
      )
    }
  }
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS admin_dashboard_metrics (
    metric_key VARCHAR(50) PRIMARY KEY,
    metric_value INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`)

const [deletedMetricRows]: any = await db.execute(
  'SELECT metric_key FROM admin_dashboard_metrics WHERE metric_key = ? LIMIT 1',
  ['deleted_users_total']
)

if (!deletedMetricRows.length) {
  const [deletedCountRows]: any = await db.execute(
    "SELECT COUNT(*) AS total FROM user_activity_logs WHERE event_type = 'deleted'"
  )

  await db.execute(
    'INSERT INTO admin_dashboard_metrics (metric_key, metric_value) VALUES (?, ?)',
    ['deleted_users_total', Number(deletedCountRows[0]?.total || 0)]
  )
}

const [activityRows]: any = await db.execute(
  'SELECT DISTINCT user_id AS userId FROM user_activity_logs'
)

const loggedUserIds = new Set(
  activityRows.map((row: { userId: number }) => Number(row.userId))
)

if (!loggedUserIds.size) {
  const [users]: any = await db.execute(
    'SELECT id, created_at AS createdAt, is_disabled AS isDisabled FROM users ORDER BY id ASC'
  )

  for (const user of users as Array<{ id: number; createdAt: string; isDisabled: number }>) {
    await db.execute(
      'INSERT INTO user_activity_logs (user_id, event_type, created_at) VALUES (?, ?, ?)',
      [user.id, 'created', user.createdAt]
    )

    if (Number(user.isDisabled)) {
      await db.execute(
        'INSERT INTO user_activity_logs (user_id, event_type, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [user.id, 'disabled']
      )
    }
  }
}
