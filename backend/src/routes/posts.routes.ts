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
  saveDraft,
  getDraft,
  deleteDraft,
} from '../controllers/posts.controller'

const postsRoutes = new Hono()


postsRoutes.get('/',       listPosts)
postsRoutes.get('/me',     listMyPosts)
postsRoutes.get('/liked',  getLikedPosts)   
postsRoutes.get('/saved',  getSavedPosts)  


postsRoutes.get('/draft',    getDraft)      
postsRoutes.post('/draft',   saveDraft)     
postsRoutes.delete('/draft', deleteDraft)   


postsRoutes.post('/', createPost)


postsRoutes.get('/:slug',        getPostBySlug)
postsRoutes.delete('/:slug',     deletePost)
postsRoutes.post('/:slug/like',  toggleLike)   
postsRoutes.post('/:slug/save',  toggleSave)  

export default postsRoutes