// Minimal typing for the Node built-in used by tests (no @types/node: devDependencies are fixed).
declare module 'node:fs' {
  export function readFileSync(path: string): Uint8Array;
}
