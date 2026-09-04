import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dir = path.resolve(__dirname, '../database/migrations')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'))

for (const file of files) {
  const fullPath = path.join(dir, file)
  const buf = fs.readFileSync(fullPath)
  let content
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    content = buf.toString('utf16le')
  } else if (buf.indexOf(0x00) !== -1) {
    content = buf.toString('utf16le')
  } else {
    content = buf.toString('utf8')
  }
  // Strip BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1)
  }
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8')
  console.log(`Normalized ${file} -> UTF-8 (${content.length} chars)`)
}
