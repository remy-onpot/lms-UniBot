type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: any[]) => {
    if (isDev) {
      console.log('🔵 [INFO]:', ...args);
    }
  },

  warn: (...args: any[]) => {
    // Warnings are usually important enough to see in prod too, but you can toggle this
    console.warn('jg [WARN]:', ...args);
  },

  error: (...args: any[]) => {
    // Errors should always be logged
    console.error('🔴 [ERROR]:', ...args);
  },

  debug: (...args: any[]) => {
    if (isDev) {
      console.debug('🐛 [DEBUG]:', ...args);
    }
  }
};