import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export interface LazyLoadErrorFallbackProps {
  /** The error that occurred */
  error: Error;
  /** Function to reset the error boundary and retry */
  resetErrorBoundary: () => void;
  /** Name of the component that failed to load */
  componentName: string;
  /** Optional custom message to display */
  customMessage?: string;
  /** Whether to show technical error details (default: true in development) */
  showErrorDetails?: boolean;
  /** Custom actions to display instead of default buttons */
  customActions?: React.ReactNode;
}

/**
 * Error fallback component for lazy-loaded chunks
 *
 * Displays a user-friendly error message when a lazy-loaded component
 * fails to load, with options to retry or reload the page.
 *
 * @example Basic usage
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <LazyLoadErrorFallback
 *       error={error}
 *       resetErrorBoundary={reset}
 *       componentName="Dashboard"
 *     />
 *   )}
 * >
 *   <Suspense fallback={<Loading />}>
 *     <Dashboard />
 *   </Suspense>
 * </ErrorBoundary>
 * ```
 *
 * @example With custom message
 * ```tsx
 * <LazyLoadErrorFallback
 *   error={error}
 *   resetErrorBoundary={reset}
 *   componentName="Payment Form"
 *   customMessage="We're having trouble loading the payment form. Please try again."
 * />
 * ```
 */
export const LazyLoadErrorFallback: React.FC<LazyLoadErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  componentName,
  customMessage,
  showErrorDetails = process.env.NODE_ENV === 'development',
  customActions,
}) => {
  const defaultMessage = `We're having trouble loading the ${componentName}. This is usually due to a temporary network issue.`;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Failed to Load {componentName}
          </h2>
          <p className="text-muted-foreground">
            {customMessage || defaultMessage}
          </p>
        </div>

        {/* Error details (development only by default) */}
        {showErrorDetails && error.message && (
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <p className="text-sm font-mono text-muted-foreground break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {customActions || (
            <>
              <Button
                onClick={resetErrorBoundary}
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reload Page
              </Button>
            </>
          )}
        </div>

        {/* Help text */}
        <p className="text-sm text-muted-foreground">
          If this problem persists, please try refreshing your browser or contact support.
        </p>
      </div>
    </div>
  );
};

/**
 * Compact version of the error fallback for inline/card contexts
 *
 * @example
 * ```tsx
 * <LazyLoadErrorFallbackCompact
 *   error={error}
 *   resetErrorBoundary={reset}
 *   componentName="Chart"
 * />
 * ```
 */
export const LazyLoadErrorFallbackCompact: React.FC<LazyLoadErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  componentName,
  showErrorDetails = false,
}) => {
  return (
    <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border border-destructive/20">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Failed to load {componentName}</span>
        </div>

        {showErrorDetails && error.message && (
          <p className="text-xs text-muted-foreground font-mono">
            {error.message}
          </p>
        )}

        <Button
          onClick={resetErrorBoundary}
          size="sm"
          variant="outline"
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    </div>
  );
};

/**
 * Minimal version - just an error message with retry button
 *
 * @example
 * ```tsx
 * <LazyLoadErrorFallbackMinimal
 *   resetErrorBoundary={reset}
 * />
 * ```
 */
export const LazyLoadErrorFallbackMinimal: React.FC<
  Pick<LazyLoadErrorFallbackProps, 'resetErrorBoundary'>
> = ({ resetErrorBoundary }) => {
  return (
    <div className="flex items-center justify-center gap-3 p-4 text-muted-foreground">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <span className="text-sm">Failed to load component</span>
      <Button
        onClick={resetErrorBoundary}
        size="sm"
        variant="ghost"
        className="h-7 text-xs"
      >
        Retry
      </Button>
    </div>
  );
};

export default LazyLoadErrorFallback;
