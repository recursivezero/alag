import { getApiBaseUrl } from './api'
import type { CommentItem } from '../types/comment'
import type { PostDetail, PostItem } from '../types/post'

type SessionOptions = {
  cookieHeader?: string
  userId?: number | null
}

const buildHeaders = (options?: SessionOptions): HeadersInit => {
  const headers: Record<string, string> = {}

  if (options?.cookieHeader) {
    headers.cookie = options.cookieHeader
  }

  if (options?.userId) {
    headers['x-user-id'] = String(options.userId)
  }

  return headers
}

export const fetchFeedPosts = async (options?: SessionOptions) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/posts`, {
      method: 'GET',
      credentials: 'include',
      headers: buildHeaders(options),
    })

    if (!response.ok) {
      throw new Error('Unable to load feed posts')
    }

    const data = (await response.json()) as { posts: PostItem[] }
    return data.posts
  } catch {
    return []
  }
}

export const fetchPostBySlug = async (slug: string, options?: SessionOptions) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/posts/${encodeURIComponent(slug)}`, {
      method: 'GET',
      credentials: 'include',
      headers: buildHeaders(options),
    })

    if (!response.ok) {
      throw new Error('Unable to load post')
    }

    const data = (await response.json()) as {
      post: PostDetail
      comments: CommentItem[]
      relatedPosts: PostItem[]
    }

    return data
  } catch {
    return null
  }
}

export const fetchPostBySlugOrNull = async (slug: string, options?: SessionOptions) => {
  return fetchPostBySlug(slug, options)
}