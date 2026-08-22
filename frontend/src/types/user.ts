export type UserProfile = {
  id: number
  name: string
  fullName?: string
  username?: string | null
  email: string
  phoneNumber?: string | null
  bio?: string | null
  picture?: string | null
  role?: string
}

export type SearchUserResult = {
  id: number
  name: string
  fullName?: string | null
  username?: string | null
  bio?: string | null
  picture?: string | null
}