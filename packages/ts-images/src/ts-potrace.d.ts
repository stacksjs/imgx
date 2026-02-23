declare module 'ts-potrace' {
  export const Potrace: any
  export const Posterizer: any
  export function trace(_data: any, _options?: any): Promise<any>
  export function posterize(_data: any, _options?: any): Promise<any>
}
