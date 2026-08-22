import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
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
