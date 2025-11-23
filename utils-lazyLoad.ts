import { lazy, ComponentType } from 'react';

/**
 * Configuration options for lazy loading with retry
 */
export interface LazyRetryOptions {
  /** Number of retry attempts before failing (default: 3) */
  retries?: number;
  /** Initial delay between retries in ms (default: 1000) */
  interval?: number;
  /** Whether to log retry attempts to console (default: true in development) */
  logging?: boolean;
}

/**
 * Enhanced lazy loading with automatic retry logic and exponential backoff
 *
 * This utility wraps React.lazy() to handle chunk loading failures gracefully.
 * When a dynamic import fails (network issues, CDN problems, etc.), it will
 * automatically retry with exponential backoff before showing an error.
 *
 * @param componentImport - The dynamic import function
 * @param componentName - Name of the component for logging (optional but recommended)
 * @param options - Configuration options
 * @returns A lazy-loaded component with retry logic
 *
 * @example
 * ```typescript
 * const Dashboard = lazyWithRetry(
 *   () => import('./components/Dashboard'),
 *   'Dashboard'
 * );
 * ```
 *
 * @example With custom options
 * ```typescript
 * const HeavyChart = lazyWithRetry(
 *   () => import('./components/HeavyChart'),
 *   'HeavyChart',
 *   { retries: 5, interval: 500 }
 * );
 * ```
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | T | any>,
  componentName: string = 'Component',
  options: LazyRetryOptions = {}
): React.LazyExoticComponent<T> => {
  const {
    retries = 3,
    interval = 1000,
    logging = process.env.NODE_ENV === 'development'
  } = options;

  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      const attemptLoad = (attemptsLeft: number, delay: number): void => {
        componentImport()
          .then((module) => {
            // Handle both default and named exports
            if ('default' in module) {
              resolve(module as { default: T });
            } else {
              resolve({ default: module as T });
            }
          })
          .catch((error) => {
            // No more retries left
            if (attemptsLeft === 0) {
              const errorMsg = `Failed to load ${componentName} after ${retries} retries`;
              if (logging) {
                console.error(errorMsg, error);
              }
              reject(new Error(errorMsg));
              return;
            }

            // Log retry attempt
            const attemptNumber = retries - attemptsLeft + 1;
            if (logging) {
              console.warn(
                `Retry ${attemptNumber}/${retries} loading ${componentName}...`,
                error
              );
            }

            // Retry with exponential backoff
            setTimeout(() => {
              attemptLoad(attemptsLeft - 1, delay * 2);
            }, delay);
          });
      };

      attemptLoad(retries, interval);
    });
  }) as React.LazyExoticComponent<T>;
};

/**
 * Lazy load a component with default retry options
 * Convenience wrapper for the most common use case
 *
 * @example
 * ```typescript
 * const Dashboard = lazyLoad(() => import('./Dashboard'), 'Dashboard');
 * ```
 */
export const lazyLoad = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | T>,
  componentName?: string
) => lazyWithRetry(componentImport, componentName);

/**
 * Lazy load a component with aggressive retry strategy (5 retries, faster interval)
 * Use for critical components that should almost never fail to load
 *
 * @example
 * ```typescript
 * const CriticalPayment = lazyLoadCritical(
 *   () => import('./PaymentForm'),
 *   'PaymentForm'
 * );
 * ```
 */
export const lazyLoadCritical = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | T>,
  componentName?: string
) => lazyWithRetry(componentImport, componentName, { retries: 5, interval: 500 });

/**
 * Lazy load a component with minimal retry (1 retry, fast fail)
 * Use for non-critical components where quick failure is acceptable
 *
 * @example
 * ```typescript
 * const OptionalWidget = lazyLoadOptional(
 *   () => import('./Widget'),
 *   'Widget'
 * );
 * ```
 */
export const lazyLoadOptional = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | T>,
  componentName?: string
) => lazyWithRetry(componentImport, componentName, { retries: 1, interval: 500 });
