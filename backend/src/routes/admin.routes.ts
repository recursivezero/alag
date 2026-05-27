import { Hono } from 'hono'
import {
	adminCreateUser,
	adminDashboardData,
	adminDeleteUser,
	adminDisableUser,
	adminEnableUser,
	adminListUsers,
	adminLogin,
	adminMe,
	adminLogout,
} from '../controllers/admin.controller'

const adminRoutes = new Hono()

adminRoutes.post('/login', adminLogin)
adminRoutes.get('/me', adminMe)
adminRoutes.post('/logout', adminLogout)
adminRoutes.get('/dashboard', adminDashboardData)
adminRoutes.get('/users', adminListUsers)
adminRoutes.post('/users', adminCreateUser)
adminRoutes.patch('/users/:id/enable', adminEnableUser)
adminRoutes.patch('/users/:id/disable', adminDisableUser)
adminRoutes.delete('/users/:id', adminDeleteUser)

export default adminRoutes
