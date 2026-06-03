import crypto from 'node:crypto'
import { Context } from 'hono'
import { getCookie } from 'hono/cookie'
import { db } from '../config/db'
import { verifyToken } from '../utils/jwt'
import { USER_SESSION_COOKIE } from '../utils/session'

const mapPostRow = (row: any) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  caption: row.caption,
  imageUrl: row.imageUrl,
  altText: row.altText,
  category: row.category,
  feedType: row.feedType || 'public',
  location: row.location,
  createdAt: row.createdAt,
  author: {
    id: row.authorId,
    name: row.authorName,
    fullName: row.authorName,
    email: row.authorEmail,
    phoneNumber: row.authorPhoneNumber,
    picture: row.authorPicture ?? null,
    username: row.authorUsername ?? null,
  },
  counts: {
    likes: Number(row.likeCount || 0),
    comments: Number(row.commentCount || 0),
    saves: Number(row.saveCount || 0),
  },
})

const getSessionUserId = (c: Context) => {
  const userIdParam = c.req.header('x-user-id')
  const parsed = Number(userIdParam)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const hashSessionToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex')

const getAuthenticatedUser = async (c: Context) => {
  const authHeader = c.req.header('Authorization')
  const cookieToken = getCookie(c, USER_SESSION_COOKIE)
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : cookieToken

  if (!token) {
    return null
  }

  const payload = verifyToken(token)
  if (!payload || !payload.sid) {
    return null
  }

  const sessionHash = hashSessionToken(payload.sid)

  const [rows]: any = await db.execute(
    `
    SELECT
      u.id,
      COALESCE(u.full_name, u.name) AS name,
      COALESCE(u.full_name, u.name) AS fullName,
      u.username,
      u.email,
      u.phone_number AS phoneNumber,
      u.picture,
      u.bio,
      u.role,
      u.is_disabled AS isDisabled
    FROM user_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.session_hash = ?
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
    LIMIT 1
    `,
    [sessionHash]
  )

  if (!rows.length || rows[0].isDisabled) {
    return null
  }

  return rows[0]
}

const buildPostQuery = (whereClause = '') => `
  SELECT
    p.id,
    p.slug,
    p.title,
    p.caption,
    p.image_url AS imageUrl,
    p.alt_text AS altText,
    p.category,
    COALESCE(p.feed_type, 'public') AS feedType,
    p.location,
    p.created_at AS createdAt,
    u.id AS authorId,
    COALESCE(u.full_name, u.name) AS authorName,
    u.username AS authorUsername,
    u.picture AS authorPicture,
    u.email AS authorEmail,
    u.phone_number AS authorPhoneNumber,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
    (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS commentCount,
    (SELECT COUNT(*) FROM saved_posts s WHERE s.post_id = p.id) AS saveCount
  FROM posts p
  INNER JOIN users u ON u.id = p.user_id
  ${whereClause}
  ORDER BY p.created_at DESC, p.id DESC
`

const isDataUrlTooLarge = (imageUrl: string) => {
  if (!imageUrl.startsWith('data:')) return false

  const commaIndex = imageUrl.indexOf(',')
  if (commaIndex < 0) return false

  const payload = imageUrl.slice(commaIndex + 1)
  const estimatedSize = Buffer.byteLength(payload, 'base64')
  return estimatedSize > 10 * 1024 * 1024
}

export const listPosts = async (c: Context) => {
  const limit = Math.min(20, Math.max(1, Number(c.req.query('limit') || 12)))
  const offset = Math.max(0, Number(c.req.query('offset') || 0))
  const userId = getSessionUserId(c)

  const [rows]: any = await db.execute(
    `${buildPostQuery("WHERE COALESCE(p.feed_type, 'public') = 'public'")} LIMIT ${limit} OFFSET ${offset}`
  )

  const postIds = (rows as Array<{ id: number }>).map((row) => Number(row.id))
  let likedPostIds = new Set<number>()
  let savedPostIds = new Set<number>()

  if (userId && postIds.length) {
    const [likes]: any = await db.execute(
      `SELECT post_id AS postId FROM likes WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
      [userId, ...postIds]
    )
    const [saves]: any = await db.execute(
      `SELECT post_id AS postId FROM saved_posts WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
      [userId, ...postIds]
    )

    likedPostIds = new Set(likes.map((row: { postId: number }) => Number(row.postId)))
    savedPostIds = new Set(saves.map((row: { postId: number }) => Number(row.postId)))
  }

  return c.json({
    posts: (rows as any[]).map((row) => ({
      ...mapPostRow(row),
      userState: {
        liked: likedPostIds.has(Number(row.id)),
        saved: savedPostIds.has(Number(row.id)),
      },
    })),
  })
}

export const listMyPosts = async (c: Context) => {
  const user = await getAuthenticatedUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const [rows]: any = await db.execute(
    `${buildPostQuery("WHERE p.user_id = ? AND COALESCE(p.feed_type, 'public') = 'personal'")} LIMIT 20`,
    [user.id]
  )

  return c.json({
    posts: (rows as any[]).map(mapPostRow),
  })
}

export const createPost = async (c: Context) => {
  const user = await getAuthenticatedUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const body = await c.req.json().catch(() => null)
  const imageUrl = typeof body?.imageUrl === 'string' ? body.imageUrl.trim() : ''
  const caption = typeof body?.caption === 'string' ? body.caption.trim() : ''
  const altText = typeof body?.altText === 'string' ? body.altText.trim() : ''
  const category = typeof body?.category === 'string' ? body.category.trim() : ''
  const feedType = body?.feedType === 'personal' ? 'personal' : 'public'
  const location = typeof body?.location === 'string' ? body.location.trim() : ''

  if (!imageUrl || !caption || !altText) {
    return c.json({ message: 'Image, caption, and alt text are required' }, 400)
  }

  if (isDataUrlTooLarge(imageUrl)) {
    return c.json({ message: 'Image must be 10MB or smaller' }, 413)
  }

  const slugBase = (caption || category || 'post')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  const slug = `${slugBase || 'post'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const title = caption.length > 90 ? `${caption.slice(0, 87).trimEnd()}...` : caption

  const [result]: any = await db.execute(
    `
    INSERT INTO posts (
      user_id,
      slug,
      title,
      caption,
      image_url,
      location,
      alt_text,
      category,
      feed_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user.id,
      slug,
      title,
      caption,
      imageUrl,
      location || null,
      altText,
      category || null,
      feedType,
    ]
  )

  return c.json({
    post: {
      id: Number(result?.insertId || Date.now()),
      slug,
      title,
      caption,
      imageUrl,
      altText,
      category: category || null,
      feedType,
      location: location || null,
      createdAt: new Date().toISOString(),
      author: {
        id: user.id,
        name: user.fullName || user.name,
        fullName: user.fullName || user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || null,
        picture: user.picture || null,
      },
      counts: {
        likes: 0,
        comments: 0,
        saves: 0,
      },
      userState: {
        liked: false,
        saved: false,
      },
    },
  }, 201)
}

export const getPostBySlug = async (c: Context) => {
  const slug = c.req.param('slug')
  const userId = getSessionUserId(c)

  const [rows]: any = await db.execute(buildPostQuery('WHERE p.slug = ?') + ' LIMIT 1', [slug])

  if (!rows.length) {
    return c.json({ message: 'Post not found' }, 404)
  }

  const post = mapPostRow(rows[0])

  const [comments]: any = await db.execute(
    `
    SELECT
      c.id,
      c.body,
      c.created_at AS createdAt,
      u.id AS authorId,
      COALESCE(u.full_name, u.name) AS authorName,
      u.email AS authorEmail,
      u.phone_number AS authorPhoneNumber
    FROM post_comments c
    INNER JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 20
    `,
    [post.id]
  )

  const [relatedRows]: any = await db.execute(
    `
    SELECT
      p.id,
      p.slug,
      p.title,
      p.caption,
      p.image_url AS imageUrl,
      p.alt_text AS altText,
      p.category,
      COALESCE(p.feed_type, 'public') AS feedType,
      p.location,
      p.created_at AS createdAt,
      u.id AS authorId,
      COALESCE(u.full_name, u.name) AS authorName,
      u.username AS authorUsername,
      u.picture AS authorPicture,
      u.email AS authorEmail,
      u.phone_number AS authorPhoneNumber,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
      (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS commentCount,
      (SELECT COUNT(*) FROM saved_posts s WHERE s.post_id = p.id) AS saveCount
    FROM posts p
    INNER JOIN users u ON u.id = p.user_id
    WHERE p.id <> ?
    ORDER BY ABS(TIMESTAMPDIFF(SECOND, p.created_at, ?)) ASC, p.created_at DESC
    LIMIT 3
    `,
    [post.id, rows[0].createdAt]
  )

  let liked = false
  let saved = false
  if (userId) {
    const [likeRows]: any = await db.execute(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ? LIMIT 1',
      [userId, post.id]
    )
    const [savedRows]: any = await db.execute(
      'SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ? LIMIT 1',
      [userId, post.id]
    )
    liked = Boolean(likeRows.length)
    saved = Boolean(savedRows.length)
  }

  return c.json({
    post: {
      ...post,
      userState: { liked, saved },
    },
    comments: comments.map((row: any) => ({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      author: {
        id: row.authorId,
        name: row.authorName,
        email: row.authorEmail,
        phoneNumber: row.authorPhoneNumber,
      },
    })),
    relatedPosts: (relatedRows as any[]).map(mapPostRow),
  })
}

export const deletePost = async (c: Context) => {
  const slug = c.req.param('slug')
  const user = await getAuthenticatedUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  // Find the post owned by the user
  const [rows]: any = await db.execute(
    'SELECT id FROM posts WHERE slug = ? AND user_id = ? LIMIT 1',
    [slug, user.id],
  )

  if (!rows.length) {
    return c.json({ message: 'Post not found' }, 404)
  }

  const postId = Number(rows[0].id)

  // Remove dependent data (likes, comments, saved) then the post itself.
  // Keep operations simple and best-effort; wrap in a transaction if DB supports it.
  try {
    await db.execute('DELETE FROM likes WHERE post_id = ?', [postId])
    await db.execute('DELETE FROM post_comments WHERE post_id = ?', [postId])
    await db.execute('DELETE FROM saved_posts WHERE post_id = ?', [postId])
    await db.execute('DELETE FROM posts WHERE id = ?', [postId])
  } catch (err) {
    return c.json({ message: 'Unable to delete post' }, 500)
  }

  return c.json({ success: true })
}
// ─────────────────────────────────────────────
// LIKE / UNLIKE  (POST /api/posts/:slug/like)
// ─────────────────────────────────────────────
// Toggles the like state for the authenticated user on the given post.
// Returns { liked: boolean, likeCount: number }.
// The Liked section is private – only the liking user can see it.
export const toggleLike = async (c: Context) => {
  const slug = c.req.param('slug')
  const user = await getAuthenticatedUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  // Resolve post id from slug
  const [postRows]: any = await db.execute(
    "SELECT id FROM posts WHERE slug = ? LIMIT 1",
    [slug],
  )
  if (!postRows.length) {
    return c.json({ message: 'Post not found' }, 404)
  }
  const postId = Number(postRows[0].id)

  // Check existing like
  const [existingRows]: any = await db.execute(
    'SELECT id FROM likes WHERE user_id = ? AND post_id = ? LIMIT 1',
    [user.id, postId],
  )

  let liked: boolean

  if (existingRows.length) {
    // Already liked → unlike
    await db.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [user.id, postId])
    liked = false
  } else {
    // Not yet liked → like
    await db.execute(
      'INSERT INTO likes (user_id, post_id) VALUES (?, ?)',
      [user.id, postId],
    )
    liked = true
  }

  // Return current like count so the client can update the counter accurately
  const [countRows]: any = await db.execute(
    'SELECT COUNT(*) AS likeCount FROM likes WHERE post_id = ?',
    [postId],
  )
  const likeCount = Number(countRows[0]?.likeCount ?? 0)

  return c.json({ liked, likeCount })
}

// ─────────────────────────────────────────────
// LIKED POSTS  (GET /api/posts/liked)
// ─────────────────────────────────────────────
// Returns all posts that the authenticated user has liked.
// Visible only to the logged-in user (private, per the flow spec).
export const getLikedPosts = async (c: Context) => {
  const user = await getAuthenticatedUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || 20)))
  const offset = Math.max(0, Number(c.req.query('offset') || 0))

  // Join posts with likes filtered to this user, newest like first
  const [rows]: any = await db.execute(
    `
    SELECT
      p.id,
      p.slug,
      p.title,
      p.caption,
      p.image_url         AS imageUrl,
      p.alt_text          AS altText,
      p.category,
      COALESCE(p.feed_type, 'public') AS feedType,
      p.location,
      p.created_at        AS createdAt,
      u.id                AS authorId,
      COALESCE(u.full_name, u.name) AS authorName,
      u.username          AS authorUsername,
      u.picture           AS authorPicture,
      u.email             AS authorEmail,
      u.phone_number      AS authorPhoneNumber,
      (SELECT COUNT(*) FROM likes l2 WHERE l2.post_id = p.id)         AS likeCount,
      (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS commentCount,
      (SELECT COUNT(*) FROM saved_posts sp WHERE sp.post_id = p.id)   AS saveCount,
      lk.created_at       AS likedAt
    FROM likes lk
    INNER JOIN posts p ON p.id = lk.post_id
    INNER JOIN users u ON u.id = p.user_id
    WHERE lk.user_id = ?
    ORDER BY lk.created_at DESC, p.id DESC
    LIMIT ${limit} OFFSET ${offset}
    `,
    [user.id],
  )

  // Check which posts the user has also saved (to populate userState.saved)
  const postIds = (rows as Array<{ id: number }>).map((r) => Number(r.id))
  let savedPostIds = new Set<number>()

  if (postIds.length) {
    const [saves]: any = await db.execute(
      `SELECT post_id AS postId FROM saved_posts WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
      [user.id, ...postIds],
    )
    savedPostIds = new Set(saves.map((r: { postId: number }) => Number(r.postId)))
  }

  return c.json({
    posts: (rows as any[]).map((row) => ({
      ...mapPostRow(row),
      // liked is always true here – user is viewing their own liked list
      userState: {
        liked: true,
        saved: savedPostIds.has(Number(row.id)),
      },
    })),
  })
}

// ─────────────────────────────────────────────
// SAVE / UNSAVE  (POST /api/posts/:slug/save)
// ─────────────────────────────────────────────
// Toggles the saved state for the authenticated user on the given post.
// Returns { saved: boolean, saveCount: number }.
// The Saved section is private – only the saving user can see it.
export const toggleSave = async (c: Context) => {
  const slug = c.req.param('slug')
  const user = await getAuthenticatedUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  // Resolve post id from slug
  const [postRows]: any = await db.execute(
    'SELECT id FROM posts WHERE slug = ? LIMIT 1',
    [slug],
  )
  if (!postRows.length) {
    return c.json({ message: 'Post not found' }, 404)
  }
  const postId = Number(postRows[0].id)

  // Check for an existing saved row
  const [existingRows]: any = await db.execute(
    'SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ? LIMIT 1',
    [user.id, postId],
  )

  let saved: boolean

  if (existingRows.length) {
    // Already saved → unsave
    await db.execute(
      'DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?',
      [user.id, postId],
    )
    saved = false
  } else {
    // Not yet saved → save
    await db.execute(
      'INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)',
      [user.id, postId],
    )
    saved = true
  }

  // Return the authoritative count after the change
  const [countRows]: any = await db.execute(
    'SELECT COUNT(*) AS saveCount FROM saved_posts WHERE post_id = ?',
    [postId],
  )
  const saveCount = Number(countRows[0]?.saveCount ?? 0)

  return c.json({ saved, saveCount })
}

// ─────────────────────────────────────────────
// SAVED POSTS  (GET /api/posts/saved)
// ─────────────────────────────────────────────
// Returns all posts that the authenticated user has saved.
// Visible only to the logged-in user (private, per the flow spec).
export const getSavedPosts = async (c: Context) => {
  const user = await getAuthenticatedUser(c)
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401)
  }

  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || 20)))
  const offset = Math.max(0, Number(c.req.query('offset') || 0))

  // Join posts with saved_posts filtered to this user, newest save first
  const [rows]: any = await db.execute(
    `
    SELECT
      p.id,
      p.slug,
      p.title,
      p.caption,
      p.image_url         AS imageUrl,
      p.alt_text          AS altText,
      p.category,
      COALESCE(p.feed_type, 'public') AS feedType,
      p.location,
      p.created_at        AS createdAt,
      u.id                AS authorId,
      COALESCE(u.full_name, u.name) AS authorName,
      u.username          AS authorUsername,
      u.picture           AS authorPicture,
      u.email             AS authorEmail,
      u.phone_number      AS authorPhoneNumber,
      (SELECT COUNT(*) FROM likes lk WHERE lk.post_id = p.id)         AS likeCount,
      (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) AS commentCount,
      (SELECT COUNT(*) FROM saved_posts s2 WHERE s2.post_id = p.id)   AS saveCount,
      sp.created_at       AS savedAt
    FROM saved_posts sp
    INNER JOIN posts p ON p.id = sp.post_id
    INNER JOIN users u ON u.id = p.user_id
    WHERE sp.user_id = ?
    ORDER BY sp.created_at DESC, p.id DESC
    LIMIT ${limit} OFFSET ${offset}
    `,
    [user.id],
  )

  // Cross-check which of these posts the user has also liked
  const postIds = (rows as Array<{ id: number }>).map((r) => Number(r.id))
  let likedPostIds = new Set<number>()

  if (postIds.length) {
    const [likes]: any = await db.execute(
      `SELECT post_id AS postId FROM likes WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
      [user.id, ...postIds],
    )
    likedPostIds = new Set(likes.map((r: { postId: number }) => Number(r.postId)))
  }

  return c.json({
    posts: (rows as any[]).map((row) => ({
      ...mapPostRow(row),
      // saved is always true here – user is viewing their own saved list
      userState: {
        liked: likedPostIds.has(Number(row.id)),
        saved: true,
      },
    })),
  })
}
