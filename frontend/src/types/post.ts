import type { CommentItem } from './comment'
import type { UserProfile } from './user'

export type PostCounts = {
  likes: number
  comments: number
  saves: number
}

export type PostUserState = {
  liked: boolean
  saved: boolean
}

export type PostItem = {
  id: number
  slug: string
  title: string
  caption: string
  imageUrl: string
  location: string | null
  createdAt: string
  author: UserProfile
  counts: PostCounts
  userState?: PostUserState
}

export type PostDetail = PostItem & {
  comments: CommentItem[]
  relatedPosts: PostItem[]
}