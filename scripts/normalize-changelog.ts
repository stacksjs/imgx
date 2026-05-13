import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const changelogPath = resolve(process.cwd(), 'CHANGELOG.md')
const changelog = readFileSync(changelogPath, 'utf8')

writeFileSync(changelogPath, changelog.replace(/^### /gm, '## '))
