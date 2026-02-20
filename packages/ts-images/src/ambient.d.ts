declare module 'sharp' {
  const sharp: any
  export default sharp
  export = sharp
}

declare module 'buddy-bot' {
  export interface BuddyBotConfig {
    repository?: any
    dashboard?: any
    workflows?: any
    packages?: any
    verbose?: boolean
    [key: string]: any
  }
}

declare module 'bunpress' {
  export interface BunPressConfig {
    name?: string
    description?: string
    url?: string
    nav?: any[]
    sidebar?: Record<string, any[]>
    themeConfig?: any
    [key: string]: any
  }
}

declare module '@stacksjs/clarity' {
  export interface ClarityOptions {
    verbose?: boolean
    [key: string]: any
  }

  export class Logger {
    constructor(name: string, options?: any)
    log(...args: any[]): void
    info(...args: any[]): void
    warn(...args: any[]): void
    error(...args: any[]): void
    debug(...args: any[]): void
    success(...args: any[]): void
    box(...args: any[]): void
  }
}

declare module 'ts-jpeg' {
  export function decode(data: Uint8Array, options?: any): { data: Uint8Array, width: number, height: number }
  export function encode(image: { width: number, height: number, data: Uint8Array | Uint8ClampedArray }, quality?: number): { data: Uint8Array }
}

declare module 'ts-png' {
  export const png: {
    sync: {
      read(buffer: Buffer): { data: Buffer, width: number, height: number }
      write(image: { width: number, height: number, data: Buffer }, options?: any): Buffer
    }
  }
}

declare module 'ts-gif' {
  export class Reader {
    constructor(buffer: Buffer)
    frameInfo(index: number): { width: number, height: number }
    decodeAndBlitFrameRGBA(index: number, pixels: Uint8Array): void
  }
  export class Writer {
    constructor(buffer: Buffer, width: number, height: number, options?: any)
    addFrame(x: number, y: number, width: number, height: number, pixels: Uint8Array): void
    end(): number
  }
}

declare module 'ts-bmp' {
  export function decode(data: Uint8Array): { data: Uint8Array, width: number, height: number }
  export function encode(image: { width: number, height: number, data: Uint8Array | Uint8ClampedArray }): Uint8Array
}

declare module 'ts-webp' {
  export function decode(data: Uint8Array): { data: Uint8Array, width: number, height: number }
  export function encode(image: { width: number, height: number, data: Uint8Array | Uint8ClampedArray }, options?: any): Uint8Array
}

declare module 'ts-avif' {
  export function decode(data: Uint8Array): { data: Uint8Array, width: number, height: number }
  export function encode(image: { width: number, height: number, data: Uint8Array | Uint8ClampedArray }, options?: any): Uint8Array
}

declare module 'vite' {
  export interface Plugin {
    name: string
    apply?: 'build' | 'serve'
    transform?(code: string, id: string): any
    [key: string]: any
  }
}
