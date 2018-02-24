declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'synchronize' {
  export function syncFn(fn: Function): any;
}

declare module 'chai' {
  global {
      export namespace Chai {
          interface Assertion {
              responseText(expectedText: string): Promise<void>;
          }
      }
  }
}
