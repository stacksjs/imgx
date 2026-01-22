import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { process } from '../src/core'
import { processSvg } from '../src/processor'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(FIXTURES_DIR, 'output', 'svg-tests')
const TEST_SVG = join(FIXTURES_DIR, 'stacks-logo.svg')

describe('SVG Processing', () => {
  beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true })
  })

  afterAll(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
  })

  it('should optimize SVG through processSvg', async () => {
    const output = join(OUTPUT_DIR, 'optimized-logo.svg')
    const result = await processSvg({
      input: TEST_SVG,
      output,
      prettify: false,
    })

    // Verify the file exists
    expect(existsSync(output)).toBe(true)

    // Verify optimization results
    expect(result.inputSize).toBeGreaterThan(0)
    expect(result.outputSize).toBeGreaterThan(0)
    expect(result.saved).toBeGreaterThanOrEqual(0) // It might already be optimized
    expect(result.savedPercentage).toBeGreaterThanOrEqual(0)

    // Basic content verification
    const content = await readFile(output, 'utf-8')
    expect(content).toContain('<svg')
    expect(content).toContain('</svg>')
  })

  it('should optimize SVG through core process', async () => {
    const output = join(OUTPUT_DIR, 'core-processed-logo.svg')
    const result = await process({
      input: TEST_SVG,
      output,
    })

    // Verify the file exists
    expect(existsSync(output)).toBe(true)

    // Verify it used the SVG processor
    expect(result.inputPath).toBe(TEST_SVG)
    expect(result.outputPath).toBe(output)
  })

  it('should handle SVG with excess whitespace and comments', async () => {
    // Create a test SVG with excess whitespace and comments
    const testSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <!-- This is a comment that should be removed -->

        <rect
          x="10"
          y="10"
          width="80"
          height="80"
          fill="blue"
        />

        <!-- Another comment -->
        <circle cx="50" cy="50" r="30" fill="red" />
      </svg>
    `

    const inputFile = join(OUTPUT_DIR, 'whitespace-test.svg')
    const outputFile = join(OUTPUT_DIR, 'whitespace-test-optimized.svg')

    await writeFile(inputFile, testSvg)

    const result = await processSvg({
      input: inputFile,
      output: outputFile,
      prettify: false,
    })

    // Verify optimization
    expect(result.saved).toBeGreaterThan(0)

    // Check content
    const content = await readFile(outputFile, 'utf-8')
    expect(content.length).toBeLessThan(testSvg.length)

    // With current SVGO setup, we may not be able to control all options
    // so we'll just check general optimization occurred
    expect(content).toContain('<svg')
    // SVGO might convert rect to path, so check for either
    expect(content.includes('<rect') || content.includes('<path')).toBe(true)
    expect(content).toContain('<circle')
  })

  it('should optimize SVG with width and height attributes', async () => {
    const output = join(OUTPUT_DIR, 'with-dimensions.svg')

    await processSvg({
      input: TEST_SVG,
      output,
    })

    const content = await readFile(output, 'utf-8')

    // Using the default SVGO preset, SVG should have width and height
    expect(content).toMatch(/width=["']\d+["']/)
    expect(content).toMatch(/height=["']\d+["']/)
  })

  it('should optimize SVG and produce valid output', async () => {
    const output = join(OUTPUT_DIR, 'valid-svg.svg')

    await processSvg({
      input: TEST_SVG,
      output,
    })

    const content = await readFile(output, 'utf-8')

    // The output should be valid SVG
    expect(content).toMatch(/<svg[^>]*>/)
    expect(content).toMatch(/<\/svg>/)
    expect(content).toContain('xmlns="http://www.w3.org/2000/svg"')
  })
})
