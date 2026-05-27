export type UserProfile = {
  id: number
  name: string
  fullName?: string
  email: string
  phoneNumber?: string | null
  picture?: string | null
  role?: string
}