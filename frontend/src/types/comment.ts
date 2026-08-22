import type { UserProfile } from './user'

export type CommentItem = {
  id: number
  body: string
  createdAt: string
  author: UserProfile
}