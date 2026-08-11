/**
 * Minimal ambient declaration for bcryptjs. server/'s package.json pulls in
 * @types/bcryptjs from npm; this sandbox has no registry access to install
 * it here, so this stands in for the two functions AuthService.ts actually
 * uses. Safe to delete once `npm install` (with @types/bcryptjs, already
 * added to worker/package.json) has been run somewhere with registry
 * access — @types/bcryptjs would then take over via node_modules/@types.
 */
declare module "bcryptjs" {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
}
