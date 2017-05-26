declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'synchronize' {
  export function syncFn(fn: Function): any;
}
