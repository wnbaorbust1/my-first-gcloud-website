/**
 * Component preloading utilities for improved perceived performance
 *
 * Preloading starts downloading component chunks before they're needed,
 * making navigation feel instant when users actually click.
 */

/**
 * Preload configuration mapping route/view names to import functions
 */
export type PreloadConfig = Record<string, () => Promise<any> | Promise<any>[]>;

/**
 * Cache to track which components have been preloaded
 * Prevents redundant downloads
 */
const preloadCache = new Set<string>();

/**
 * Creates a preload function based on a configuration object
 *
 * @param config - Mapping of view names to import functions
 * @returns Function that preloads components for a given view
 *
 * @example
 * ```typescript
 * const preloadComponent = createPreloader({
 *   'dashboard': () => import('./Dashboard'),
 *   'profile': () => [
 *     import('./Profile'),
 *     import('./ProfileSettings')
 *   ]
 * });
 *
 * // Later, on hover or before navigation
 * preloadComponent('dashboard');
 * ```
 */
export const createPreloader = (config: PreloadConfig) => {
  return (viewName: string): void => {
    if (!config[viewName]) {
      console.warn(`No preload configuration found for view: ${viewName}`);
      return;
    }

    // Skip if already preloaded
    if (preloadCache.has(viewName)) {
      return;
    }

    // Mark as preloaded to prevent duplicates
    preloadCache.add(viewName);

    const imports = config[viewName]();

    // Handle both single import and array of imports
    const importPromises = Array.isArray(imports) ? imports : [imports];

    // Fire and forget - we don't need to wait for these
    importPromises.forEach(promise => {
      promise.catch(err => {
        console.warn(`Failed to preload component for ${viewName}:`, err);
        // Remove from cache so it can be retried
        preloadCache.delete(viewName);
      });
    });
  };
};

/**
 * Clears the preload cache
 * Useful for testing or if you want to force re-preloading
 */
export const clearPreloadCache = (): void => {
  preloadCache.clear();
};

/**
 * Check if a view has been preloaded
 *
 * @param viewName - Name of the view to check
 * @returns true if the view has been preloaded
 */
export const isPreloaded = (viewName: string): boolean => {
  return preloadCache.has(viewName);
};

/**
 * Preload multiple views at once
 *
 * @param preloader - The preload function created by createPreloader
 * @param viewNames - Array of view names to preload
 *
 * @example
 * ```typescript
 * // Preload common routes on app initialization
 * preloadMultiple(preloadComponent, ['dashboard', 'profile', 'settings']);
 * ```
 */
export const preloadMultiple = (
  preloader: (viewName: string) => void,
  viewNames: string[]
): void => {
  viewNames.forEach(preloader);
};

/**
 * Creates a hover handler that preloads a component
 * Useful for navigation items
 *
 * @param preloader - The preload function
 * @param viewName - View name to preload
 * @returns Mouse event handler
 *
 * @example
 * ```typescript
 * <button
 *   onMouseEnter={createHoverPreload(preloadComponent, 'dashboard')}
 *   onClick={() => navigate('/dashboard')}
 * >
 *   Dashboard
 * </button>
 * ```
 */
export const createHoverPreload = (
  preloader: (viewName: string) => void,
  viewName: string
) => {
  let hasPreloaded = false;

  return () => {
    if (!hasPreloaded) {
      preloader(viewName);
      hasPreloaded = true;
    }
  };
};

/**
 * Preload on idle using requestIdleCallback
 * Schedules preloading during browser idle time
 *
 * @param preloader - The preload function
 * @param viewNames - Views to preload during idle time
 * @param options - requestIdleCallback options
 *
 * @example
 * ```typescript
 * // Preload less critical routes when browser is idle
 * preloadOnIdle(preloadComponent, ['analytics', 'reports', 'settings']);
 * ```
 */
export const preloadOnIdle = (
  preloader: (viewName: string) => void,
  viewNames: string[],
  options: IdleRequestOptions = { timeout: 2000 }
): void => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      preloadMultiple(preloader, viewNames);
    }, options);
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      preloadMultiple(preloader, viewNames);
    }, 1);
  }
};

/**
 * Preload after a delay
 * Simple alternative to idle preloading
 *
 * @param preloader - The preload function
 * @param viewNames - Views to preload
 * @param delay - Delay in milliseconds (default: 1000)
 *
 * @example
 * ```typescript
 * // Preload secondary routes 1 second after page load
 * preloadAfterDelay(preloadComponent, ['settings', 'help'], 1000);
 * ```
 */
export const preloadAfterDelay = (
  preloader: (viewName: string) => void,
  viewNames: string[],
  delay: number = 1000
): void => {
  setTimeout(() => {
    preloadMultiple(preloader, viewNames);
  }, delay);
};

/**
 * Hook-style preloader for React components
 * Returns a preload function tied to the component lifecycle
 *
 * @example
 * ```typescript
 * function App() {
 *   const preload = usePreloader({
 *     dashboard: () => import('./Dashboard'),
 *     profile: () => import('./Profile')
 *   });
 *
 *   return (
 *     <button onMouseEnter={() => preload('dashboard')}>
 *       Dashboard
 *     </button>
 *   );
 * }
 * ```
 */
export const usePreloader = (config: PreloadConfig) => {
  // In a real implementation, you'd use React.useCallback
  // This is the pure function version
  return createPreloader(config);
};
