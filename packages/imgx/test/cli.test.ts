import { afterAll, beforeAll, describe, expect, jest, test } from 'bun:test'
import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

// Define ExecResult interface for child_process.exec
interface ExecResult {
  stdout: string
  stderr: string
}

const execAsync = promisify(exec) as (command: string) => Promise<ExecResult>

const CLI_BIN = join(import.meta.dir, '../bin/cli.ts')
const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(FIXTURES_DIR, 'output')
const TEST_IMAGE = join(FIXTURES_DIR, 'app-icon.png') // Use existing test image

function runCli(args: string): Promise<ExecResult> {
  return execAsync(`bun ${CLI_BIN} ${args}`)
}

describe('CLI', () => {
  beforeAll(async () => {
    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
      await mkdir(OUTPUT_DIR, { recursive: true })
    }
  })

  afterAll(async () => {
    // Cleanup can be added here if needed
  })

  test('shows help when no arguments provided', async () => {
    const { stdout } = await runCli('--help')
    expect(stdout).toContain('imgx')
    expect(stdout).toContain('Commands:')
    expect(stdout).toContain('optimize')
  })

  test('shows version', async () => {
    const { stdout } = await runCli('--version')
    // Version format check (semver)
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('optimizes a single image', async () => {
    const outputPath = join(OUTPUT_DIR, 'optimized.png')

    const { stdout } = await runCli(`optimize ${TEST_IMAGE} ${outputPath} -q 75`)

    expect(stdout).toContain('Processed')
    expect(stdout).toContain('Input size:')
    expect(stdout).toContain('Output size:')
    expect(existsSync(outputPath)).toBe(true)
  })

  test('converts image format', async () => {
    const outputPath = join(OUTPUT_DIR, 'converted.webp')

    const { stdout } = await runCli(`convert ${TEST_IMAGE} ${outputPath} -f webp`)

    expect(stdout).toContain('Processed')
    expect(existsSync(outputPath)).toBe(true)
  })

  test('analyzes images', async () => {
    const { stdout } = await runCli(`analyze ${TEST_IMAGE}`)

    expect(stdout).toContain('Image Analysis Report')
    expect(stdout).toContain('Total images:')
  })

  test('generates app icons', async () => {
    const outputDir = join(OUTPUT_DIR, 'app-icons')

    const { stdout } = await runCli(`app-icon ${TEST_IMAGE} -o ${outputDir}`)

    expect(stdout).toContain('Generated app icons')
    expect(stdout).toContain('Output directory:')
  })
})
