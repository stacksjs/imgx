import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { process } from '../src/core'
import { imageToSvg, optimizeSvg, processSvg } from '../src/processor'

const FIXTURES_DIR = join(import.meta.dir, 'fixtures')
const OUTPUT_DIR = join(FIXTURES_DIR, 'output', 'svg-advanced-tests')
const TEST_SVG = join(FIXTURES_DIR, 'stacks-logo.svg')
const TEST_IMAGE = join(FIXTURES_DIR, 'app-icon.png')

describe('Advanced SVG Processing', () => {
  beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true })
  })

  afterAll(async () => {
    await rm(OUTPUT_DIR, { recursive: true, force: true })
  })

  describe('SVG Optimization', () => {
    it('should optimize SVG with basic options', async () => {
      const output = join(OUTPUT_DIR, 'optimized-basic.svg')
      const result = await optimizeSvg(TEST_SVG, {
        output,
        prettify: false,
        removeComments: true,
      })

      // Verify the file exists
      expect(existsSync(output)).toBe(true)

      // Verify optimization results
      expect(result.inputSize).toBeGreaterThan(0)
      expect(result.outputSize).toBeGreaterThan(0)
      expect(result.saved).toBeGreaterThanOrEqual(0)
      expect(result.savedPercentage).toBeGreaterThanOrEqual(0)
      expect(result.content).toBeTruthy()

      // Check content
      const content = await readFile(output, 'utf-8')
      expect(content).toContain('<svg')
      expect(content).toContain('</svg>')
    })

    it('should optimize SVG with multipass enabled', async () => {
      const output = join(OUTPUT_DIR, 'optimized-multipass.svg')
      const result = await optimizeSvg(TEST_SVG, {
        output,
        multipass: true,
        removeComments: true,
      })

      expect(existsSync(output)).toBe(true)
      expect(result.multipass).toBe(true)

      // Multipass should generally provide more optimization
      expect(result.saved).toBeGreaterThanOrEqual(0)
    })

    it('should optimize SVG with various options', async () => {
      const output = join(OUTPUT_DIR, 'optimized-various.svg')
      await optimizeSvg(TEST_SVG, {
        output,
        removeComments: true,
        removeViewBox: false, // Important to keep
      })

      expect(existsSync(output)).toBe(true)

      // Check output for expected modifications
      const content = await readFile(output, 'utf-8')
      expect(content).toContain('viewBox')
      expect(content).not.toContain('<!--')
    })

    it('should handle SVG string as input', async () => {
      const testSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
          <!-- This is a comment -->
          <rect x="10" y="10" width="80" height="80" fill="blue"/>
        </svg>
      `

      const result = await optimizeSvg(testSVG, {
        removeComments: true,
        // Explicitly disable shape conversion for this test
        convertShapeToPath: false,
      })

      expect(result.content).not.toContain('<!-- This is a comment -->')
      // Check for either rect or path, since SVGO might still convert shapes despite the setting
      expect(result.content.includes('<rect') || result.content.includes('<path')).toBe(true)
      expect(result.inputSize).toBeGreaterThan(0)
      expect(result.outputSize).toBeGreaterThan(0)
    })
  })

  describe('Image to SVG Conversion', () => {
    it('should convert PNG to black and white SVG', async () => {
      try {
        const output = join(OUTPUT_DIR, 'png-to-bw.svg')
        const result = await imageToSvg(TEST_IMAGE, {
          mode: 'bw',
          output,
          threshold: 128,
        })

        expect(existsSync(output)).toBe(true)
        expect(result.svgContent).toContain('<svg')
        expect(result.svgContent).toContain('</svg>')
        expect(result.svgContent).toContain('<path')
      }
      catch (error) {
        if (error instanceof Error && error.message.includes('Potrace library is required')) {
          console.warn('Skipping test: Potrace library not installed')
          return
        }
        throw error
      }
    })

    it('should convert PNG to color SVG', async () => {
      try {
        const output = join(OUTPUT_DIR, 'png-to-color.svg')
        const result = await imageToSvg(TEST_IMAGE, {
          mode: 'color',
          output,
          colorCount: 16,
        })

        expect(existsSync(output)).toBe(true)
        expect(result.svgContent).toContain('<svg')
        expect(result.svgContent).toContain('</svg>')
        // Check that there's at least one path in the SVG
        expect(result.svgContent).toContain('<path')
      }
      catch (error) {
        if (error instanceof Error && error.message.includes('Potrace library is required')) {
          console.warn('Skipping test: Potrace library not installed')
          return
        }
        throw error
      }
    })

    it('should convert PNG to posterized SVG', async () => {
      try {
        const output = join(OUTPUT_DIR, 'png-to-posterized.svg')
        const result = await imageToSvg(TEST_IMAGE, {
          mode: 'posterized',
          output,
          steps: 8, // Posterization steps/colors
        })

        expect(existsSync(output)).toBe(true)
        expect(result.svgContent).toContain('<svg')
        expect(result.svgContent).toContain('</svg>')
      }
      catch (error) {
        if (error instanceof Error && error.message.includes('Potrace library is required')) {
          console.warn('Skipping test: Potrace library not installed')
          return
        }
        throw error
      }
    })

    it('should convert with background color', async () => {
      try {
        const output = join(OUTPUT_DIR, 'png-with-background.svg')
        const result = await imageToSvg(TEST_IMAGE, {
          mode: 'bw',
          output,
          background: '#f0f0f0',
        })

        expect(existsSync(output)).toBe(true)
        expect(result.svgContent).toContain('fill="#f0f0f0"')
      }
      catch (error) {
        if (error instanceof Error && error.message.includes('Potrace library is required')) {
          console.warn('Skipping test: Potrace library not installed')
          return
        }
        throw error
      }
    })

    it('should convert and optimize the resulting SVG', async () => {
      try {
        const output = join(OUTPUT_DIR, 'png-to-svg-optimized.svg')
        const result = await imageToSvg(TEST_IMAGE, {
          mode: 'bw',
          output,
          optionsSvg: {
            removeViewBox: false,
            cleanupIDs: true,
            removeComments: true,
          },
        })

        expect(existsSync(output)).toBe(true)
        expect(result.svgContent).toContain('viewBox')
        expect(result.svgContent).not.toContain('<!--')
      }
      catch (error) {
        if (error instanceof Error && error.message.includes('Potrace library is required')) {
          console.warn('Skipping test: Potrace library not installed')
          return
        }
        throw error
      }
    })
  })
})
