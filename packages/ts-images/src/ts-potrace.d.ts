declare module 'ts-potrace' {
  export const Potrace: any
  export const Posterizer: any
  export function trace(data: any, options?: any): Promise<any>
  export function posterize(data: any, options?: any): Promise<any>
}
