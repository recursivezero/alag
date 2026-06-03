import { Hono } from 'hono'
import {
  createPost,
  getPostBySlug,
  listMyPosts,
  listPosts,
  deletePost,
  toggleLike,
  getLikedPosts,
  toggleSave,
  getSavedPosts,
} from '../controllers/posts.controller'

const postsRoutes = new Hono()

// Static routes must come before parameterised ones so that
// GET /liked and GET /saved are never swallowed by GET /:slug.
postsRoutes.get('/',      listPosts)
postsRoutes.get('/me',    listMyPosts)
postsRoutes.get('/liked', getLikedPosts)   // private: authenticated user's liked posts
postsRoutes.get('/saved', getSavedPosts)   // private: authenticated user's saved posts
postsRoutes.post('/',     createPost)
postsRoutes.get('/:slug',         getPostBySlug)
postsRoutes.delete('/:slug',      deletePost)
postsRoutes.post('/:slug/like',   toggleLike)   // toggle like / unlike
postsRoutes.post('/:slug/save',   toggleSave)   // toggle save / unsave

export default postsRoutes
