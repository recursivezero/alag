import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	vite: {
		plugins: [tailwindcss()],
	},
	output: 'server',
	adapter: node({
		mode: 'standalone',
	}),
	devToolbar: {
		enabled: false,
	},
	server: {
		port: 4321,
		strictPort: true,
	},
	preview: {
		port: 4321,
		strictPort: true,
	},
})
