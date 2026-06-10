import { getApiBaseUrl } from './api'
import type { CommentItem } from '../types/comment'
import type { PostDetail, PostItem } from '../types/post'

type SessionOptions = {
  cookieHeader?: string
  userId?: number | null
  filter?: string
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
    const query = options?.filter
      ? `?filter=${encodeURIComponent(options.filter)}`
      : ''

    const response = await fetch(`${getApiBaseUrl()}/posts${query}`, {
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

export const fetchMyPosts = async (options?: SessionOptions) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/posts/me`, {
      method: 'GET',
      credentials: 'include',
      headers: buildHeaders(options),
    })

    if (!response.ok) {
      throw new Error('Unable to load my posts')
    }

    const data = (await response.json()) as { posts: PostItem[] }
    return data.posts
  } catch {
    return []
  }
}

export type CreatePostInput = {
  imageUrl: string
  caption: string
  altText: string
  category?: string
  feedType: 'public' | 'personal'
  location?: string
}

export const createPost = async (payload: CreatePostInput, signal?: AbortSignal) => {
  const response = await fetch(`${getApiBaseUrl()}/posts`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message || 'Unable to upload post')
  }

  const data = (await response.json()) as { post: PostItem }
  return data.post
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

export const deletePost = async (slug: string) => {
  const response = await fetch(`${getApiBaseUrl()}/posts/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message || 'Unable to delete post')
  }

  return true
}

// LIKED POSTS  (private – current user only)

export const fetchLikedPosts = async (options?: SessionOptions) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/posts/liked`, {
      method: 'GET',
      credentials: 'include',
      headers: buildHeaders(options),
    })

    if (!response.ok) {
      throw new Error('Unable to load liked posts')
    }

    const data = (await response.json()) as { posts: PostItem[] }
    return data.posts
  } catch {
    return []
  }
}


// TOGGLE LIKE  (POST /api/posts/:slug/like)

export const togglePostLike = async (
  slug: string,
): Promise<{ liked: boolean; likeCount: number }> => {
  const response = await fetch(
    `${getApiBaseUrl()}/posts/${encodeURIComponent(slug)}/like`,
    {
      method: 'POST',
      credentials: 'include',
    },
  )

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message || 'Unable to toggle like')
  }

  return response.json() as Promise<{ liked: boolean; likeCount: number }>
}


// SAVED POSTS  (private – current user only)

export const fetchSavedPosts = async (options?: SessionOptions) => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/posts/saved`, {
      method: 'GET',
      credentials: 'include',
      headers: buildHeaders(options),
    })

    if (!response.ok) {
      throw new Error('Unable to load saved posts')
    }

    const data = (await response.json()) as { posts: PostItem[] }
    return data.posts
  } catch {
    return []
  }
}

// TOGGLE SAVE  (POST /api/posts/:slug/save)

export const togglePostSave = async (
  slug: string,
): Promise<{ saved: boolean; saveCount: number }> => {
  const response = await fetch(
    `${getApiBaseUrl()}/posts/${encodeURIComponent(slug)}/save`,
    {
      method: 'POST',
      credentials: 'include',
    },
  )

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message || 'Unable to toggle save')
  }

  return response.json() as Promise<{ saved: boolean; saveCount: number }>
}
