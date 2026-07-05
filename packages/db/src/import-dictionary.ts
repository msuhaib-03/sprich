/**
 * Import the FreeDict deu-eng dictionary (TEI XML) into DictionaryEntry.
 *
 * Source: https://download.freedict.org/dictionaries/deu-eng/ (version 1.9-fd1)
 * License: GPLv3 / AGPLv3 (built from the Ding dictionary). See NOTICE.
 *
 * Usage:  ts-node src/import-dictionary.ts [path-to-deu-eng.tei]
 * Default path: ../../tmp/freedict/deu-eng/deu-eng.tei (gitignored scratch)
 *
 * Streams the file line-by-line (the TEI is ~450 MB) and batch-inserts.
 * Idempotent: sourceId (TEI xml:id) is unique, so re-runs skip duplicates.
 */
import { PrismaClient, Gender } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const prisma = new PrismaClient()

const DEFAULT_TEI = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'tmp',
  'freedict',
  'deu-eng',
  'deu-eng.tei',
)

const BATCH_SIZE = 2000

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .trim()
}

function mapGender(gen: string | null): Gender | null {
  switch (gen) {
    case 'masc':
      return 'masculine'
    case 'fem':
      return 'feminine'
    case 'neut':
      return 'neuter'
    default:
      return null
  }
}

interface ParsedEntry {
  sourceId: string
  german: string
  english: string
  pos: string | null
  gender: Gender | null
  example: string | null
}

function parseBlock(id: string, lines: string[]): ParsedEntry | null {
  let orth: string | null = null
  let gen: string | null = null
  let pos: string | null = null
  let example: string | null = null
  const translations: string[] = []
  const citStack: string[] = []

  for (const line of lines) {
    const orthM = line.match(/<orth>(.*?)<\/orth>/)
    if (orthM && orth === null) orth = decodeXml(orthM[1])

    const genM = line.match(/<gen>(.*?)<\/gen>/)
    if (genM && gen === null) gen = genM[1].trim()

    const posM = line.match(/<pos>(.*?)<\/pos>/)
    if (posM && pos === null) pos = posM[1].trim()

    if (/<cit type="trans"/.test(line)) citStack.push('trans')
    else if (/<cit type="example"/.test(line)) citStack.push('example')
    if (/<\/cit>/.test(line)) citStack.pop()

    const insideExample = citStack.includes('example')

    const enM = line.match(/<quote xml:lang="en">(.*?)<\/quote>/)
    if (enM && !insideExample) {
      const t = decodeXml(enM[1])
      if (t) translations.push(t)
    }

    const deM = line.match(/<quote xml:lang="de">(.*?)<\/quote>/)
    if (deM && insideExample && example === null) {
      const e = decodeXml(deM[1])
      if (e) example = e
    }
  }

  if (!orth) return null
  const english = [...new Set(translations)].join('; ').slice(0, 800)
  if (!english) return null

  return { sourceId: id, german: orth, english, pos, gender: mapGender(gen), example }
}

async function main() {
  const teiPath = process.argv[2] ?? DEFAULT_TEI
  if (!fs.existsSync(teiPath)) {
    console.error(`❌ TEI file not found at: ${teiPath}`)
    console.error('   Download + extract FreeDict deu-eng first (see NOTICE / import header).')
    process.exit(1)
  }

  console.log(`📖 Importing dictionary from ${teiPath}`)
  const existing = await prisma.dictionaryEntry.count()
  if (existing > 0) console.log(`   (${existing} entries already present — duplicates will be skipped)`)

  const rl = readline.createInterface({
    input: fs.createReadStream(teiPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  })

  let inEntry = false
  let currentId = ''
  let buffer: string[] = []
  let batch: ParsedEntry[] = []
  let parsed = 0
  let inserted = 0

  async function flush() {
    if (batch.length === 0) return
    const res = await prisma.dictionaryEntry.createMany({ data: batch, skipDuplicates: true })
    inserted += res.count
    batch = []
    process.stdout.write(`\r   parsed ${parsed} · inserted ${inserted}   `)
  }

  for await (const line of rl) {
    if (!inEntry) {
      const start = line.match(/<entry xml:id="([^"]+)"/)
      if (start) {
        inEntry = true
        currentId = start[1]
        buffer = [line]
      }
      continue
    }

    buffer.push(line)
    if (line.includes('</entry>')) {
      const entry = parseBlock(currentId, buffer)
      if (entry) {
        parsed++
        batch.push(entry)
        if (batch.length >= BATCH_SIZE) await flush()
      }
      inEntry = false
      buffer = []
    }
  }
  await flush()

  const total = await prisma.dictionaryEntry.count()
  console.log(`\n✅ Done. Parsed ${parsed} entries, inserted ${inserted} new. Table now holds ${total}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
