import { Context } from 'hono'
import { db } from '../config/db'

const mapPostRow = (row: any) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  caption: row.caption,
  imageUrl: row.imageUrl,
  location: row.location,
  createdAt: row.createdAt,
  author: {
    id: row.authorId,
    name: row.authorName,
    email: row.authorEmail,
    phoneNumber: row.authorPhoneNumber,
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

const buildPostQuery = (single = false) => `
  SELECT
    p.id,
    p.slug,
    p.title,
    p.caption,
    p.image_url AS imageUrl,
    p.location,
    p.created_at AS createdAt,
    u.id AS authorId,
    COALESCE(u.full_name, u.name) AS authorName,
    u.email AS authorEmail,
    u.phone_number AS authorPhoneNumber,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likeCount,
    (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS commentCount,
    (SELECT COUNT(*) FROM saved_posts s WHERE s.post_id = p.id) AS saveCount
  FROM posts p
  INNER JOIN users u ON u.id = p.user_id
  ${single ? 'WHERE p.slug = ?' : ''}
  ORDER BY p.created_at DESC, p.id DESC
`

export const listPosts = async (c: Context) => {
  const limit = Math.min(20, Math.max(1, Number(c.req.query('limit') || 12)))
  const offset = Math.max(0, Number(c.req.query('offset') || 0))
  const userId = getSessionUserId(c)

  const [rows]: any = await db.execute(
    `${buildPostQuery(false)} LIMIT ${limit} OFFSET ${offset}`
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

export const getPostBySlug = async (c: Context) => {
  const slug = c.req.param('slug')
  const userId = getSessionUserId(c)

  const [rows]: any = await db.execute(buildPostQuery(true) + ' LIMIT 1', [slug])

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
      p.location,
      p.created_at AS createdAt,
      u.id AS authorId,
      COALESCE(u.full_name, u.name) AS authorName,
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