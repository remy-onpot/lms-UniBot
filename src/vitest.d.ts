import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeInTheDocument(): T;
    toHaveClass(className: string): T;
    toBeDisabled(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeInTheDocument(): any;
    toHaveClass(className: string): any;
    toBeDisabled(): any;
  }
}
