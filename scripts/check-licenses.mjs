import { readFileSync } from 'node:fs'

const allowedLicenses = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'MPL-2.0',
])

const lockfile = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
const packages = Object.entries(lockfile.packages).filter(([path]) => path !== '')
const unsupported = packages.filter(([, metadata]) => !metadata.license || !allowedLicenses.has(metadata.license))

if (unsupported.length > 0) {
  console.error('Unsupported or missing package licenses:')
  unsupported.forEach(([path, metadata]) => console.error(`- ${path}: ${metadata.license ?? 'missing'}`))
  process.exitCode = 1
} else {
  console.log(`Checked ${packages.length} packages. All declared licenses are allowed.`)
}
