import dotenv from 'dotenv'
import mysql from 'mysql2/promise'
import { hashPassword } from './src/utils/hash.js'


dotenv.config()

const DEFAULT_ADMIN = {
  fullName: 'Admin User',
  email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@gmail.com',
  password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@1234',
  role: 'admin',
}

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'alag',
  })

  try {
    const [existingAdminRows]: any = await connection.execute(
      'SELECT id FROM admins WHERE email = ? LIMIT 1',
      [DEFAULT_ADMIN.email],
    )

    if (existingAdminRows.length) {
      console.log(`[seed] Admin "${DEFAULT_ADMIN.email}" already exists. Skipping.`)
      return
    }

    const hashedPassword = await hashPassword(DEFAULT_ADMIN.password)

    await connection.execute(
      'INSERT INTO admins (full_name, email, password, role) VALUES (?, ?, ?, ?)',
      [DEFAULT_ADMIN.fullName, DEFAULT_ADMIN.email, hashedPassword, DEFAULT_ADMIN.role],
    )

    console.log(`[seed] Created admin "${DEFAULT_ADMIN.email}".`)
  } finally {
    await connection.end()
  }
}

seed()
  .then(() => {
    console.log('[seed] Done.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[seed] Failed:', error)
    process.exit(1)
  })