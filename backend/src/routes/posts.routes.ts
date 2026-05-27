import { Hono } from 'hono'
import { getPostBySlug, listPosts } from '../controllers/posts.controller'

const postsRoutes = new Hono()

postsRoutes.get('/', listPosts)
postsRoutes.get('/:slug', getPostBySlug)

export default postsRoutes