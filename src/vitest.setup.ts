import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Add custom matchers for DOM testing
expect.extend({
  toBeInTheDocument(element: HTMLElement | null) {
    const pass = element !== null && document.contains(element);
    return {
      pass,
      message: () => pass ? 'element is in document' : 'element is not in document'
    };
  },
  toHaveClass(element: HTMLElement | null, className: string) {
    if (!element) {
      return {
        pass: false,
        message: () => 'element is null'
      };
    }
    const pass = element.classList.contains(className);
    return {
      pass,
      message: () => pass ? `element has class ${className}` : `element does not have class ${className}`
    };
  },
  toBeDisabled(element: HTMLElement | null) {
    if (!element) {
      return {
        pass: false,
        message: () => 'element is null'
      };
    }
    const pass = (element as HTMLButtonElement | HTMLInputElement).disabled === true;
    return {
      pass,
      message: () => pass ? 'element is disabled' : 'element is not disabled'
    };
  }
});

