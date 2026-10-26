import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const siteRoot = resolve(process.cwd(), 'dist')
const port = Number(process.env.PORT || 4173)
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed')
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  } catch {
    response.writeHead(400).end('Bad request')
    return
  }

  const requestedPath = resolve(siteRoot, `.${pathname}`)
  if (requestedPath !== siteRoot && !requestedPath.startsWith(`${siteRoot}${sep}`)) {
    response.writeHead(403).end('Forbidden')
    return
  }

  let filePath = requestedPath
  try {
    if (statSync(filePath).isDirectory()) filePath = resolve(filePath, 'index.html')
    else statSync(filePath)
  } catch {
    filePath = resolve(siteRoot, 'index.html')
  }

  const contentType = mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream'
  response.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  createReadStream(filePath).on('error', () => {
    if (!response.headersSent) response.writeHead(404)
    response.end('Not found')
  }).pipe(response)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`LifeXP is available at http://localhost:${port}`)
})
