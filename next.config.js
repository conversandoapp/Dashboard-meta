```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configuración para Render
  output: 'standalone',
  images: {
    domains: ['scontent.xx.fbcdn.net', 'scontent.cdninstagram.com'],
  },
}

module.exports = nextConfig
```
