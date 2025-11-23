/**
 * Example: How to use the lazy loading utilities in your application
 *
 * This file demonstrates best practices for implementing the optimized
 * lazy loading pattern across your React application.
 */

import React, { Suspense, useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  LazyLoadErrorFallback,
  LazyLoadErrorFallbackCompact,
} from '@/components/common/LazyLoadErrorFallback';
import {
  lazyWithRetry,
  lazyLoad,
  lazyLoadCritical,
  lazyLoadOptional,
} from '@/utils/lazyLoad';
import {
  createPreloader,
  preloadOnIdle,
  preloadAfterDelay,
  createHoverPreload,
} from '@/utils/preload';

// ============================================================================
// STEP 1: Define your lazy-loaded components
// ============================================================================

// Critical components - use lazyLoadCritical for aggressive retry
const Dashboard = lazyLoadCritical(
  () => import('@/components/Dashboard'),
  'Dashboard'
);

const PaymentForm = lazyLoadCritical(
  () => import('@/components/PaymentForm'),
  'PaymentForm'
);

// Standard components - use lazyLoad for default retry logic
const ClientDashboard = lazyLoad(
  () => import('@/components/ClientDashboard'),
  'ClientDashboard'
);

const ClientsList = lazyLoad(
  () => import('@/components/ClientsList'),
  'ClientsList'
);

const Analytics = lazyLoad(
  () => import('@/components/AnalyticsDashboard'),
  'AnalyticsDashboard'
);

// Optional/non-critical components - use lazyLoadOptional for fast fail
const HelpWidget = lazyLoadOptional(
  () => import('@/components/HelpWidget'),
  'HelpWidget'
);

// Or use lazyWithRetry with custom options
const HeavyChart = lazyWithRetry(
  () => import('@/components/HeavyChart'),
  'HeavyChart',
  { retries: 5, interval: 500, logging: true }
);

// ============================================================================
// STEP 2: Configure preloading
// ============================================================================

const preloadComponent = createPreloader({
  // Single component per route
  'dashboard': () => import('@/components/Dashboard'),
  'analytics': () => import('@/components/AnalyticsDashboard'),

  // Multiple components per route (preload related components together)
  'client-dashboard': () => [
    import('@/components/ClientDashboard'),
    import('@/components/ClientDetailView'),
  ],

  'clients': () => import('@/components/ClientsList'),

  'payment': () => [
    import('@/components/PaymentForm'),
    import('@/components/PaymentHistory'),
  ],

  // Add all your routes here
  'settings': () => import('@/components/Settings'),
  'help': () => import('@/components/HelpWidget'),
});

// ============================================================================
// STEP 3: Example component using everything together
// ============================================================================

const ExampleApp: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  // Preload common routes after initial render
  useEffect(() => {
    // Preload critical routes after 1 second
    preloadAfterDelay(
      preloadComponent,
      ['clients', 'client-dashboard'],
      1000
    );

    // Preload non-critical routes during idle time
    preloadOnIdle(
      preloadComponent,
      ['analytics', 'settings', 'help']
    );
  }, []);

  // View change handler with preloading
  const handleViewChange = useCallback((view: string) => {
    // Start preloading immediately when view changes
    preloadComponent(view);
    setCurrentView(view);

    // Optional: Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.replaceState({}, '', url.toString());
  }, []);

  // ============================================================================
  // STEP 4: Render with proper error boundaries and suspense
  // ============================================================================

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          // Wrap each lazy component with ErrorBoundary + Suspense
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Dashboard"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading dashboard..." />}>
              <Dashboard />
            </Suspense>
          </ErrorBoundary>
        );

      case 'clients':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Clients List"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading clients..." />}>
              <ClientsList />
            </Suspense>
          </ErrorBoundary>
        );

      case 'client-dashboard':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Client Dashboard"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading dashboard..." />}>
              <ClientDashboard />
            </Suspense>
          </ErrorBoundary>
        );

      case 'analytics':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Analytics"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading analytics..." />}>
              <Analytics />
            </Suspense>
          </ErrorBoundary>
        );

      case 'payment':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Payment Form"
                customMessage="We're having trouble loading the payment form. Please refresh and try again."
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading payment form..." />}>
              <PaymentForm />
            </Suspense>
          </ErrorBoundary>
        );

      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="app">
      {/* Navigation with hover preloading */}
      <nav className="navigation">
        <button
          onMouseEnter={createHoverPreload(preloadComponent, 'dashboard')}
          onClick={() => handleViewChange('dashboard')}
          className={currentView === 'dashboard' ? 'active' : ''}
        >
          Dashboard
        </button>

        <button
          onMouseEnter={createHoverPreload(preloadComponent, 'clients')}
          onClick={() => handleViewChange('clients')}
          className={currentView === 'clients' ? 'active' : ''}
        >
          Clients
        </button>

        <button
          onMouseEnter={createHoverPreload(preloadComponent, 'analytics')}
          onClick={() => handleViewChange('analytics')}
          className={currentView === 'analytics' ? 'active' : ''}
        >
          Analytics
        </button>

        <button
          onMouseEnter={createHoverPreload(preloadComponent, 'payment')}
          onClick={() => handleViewChange('payment')}
          className={currentView === 'payment' ? 'active' : ''}
        >
          Payment
        </button>
      </nav>

      {/* Main content area */}
      <main className="content">
        {renderView()}
      </main>

      {/* Optional: Help widget that can fail silently */}
      <aside className="sidebar">
        <ErrorBoundary
          fallback={(error, reset) => (
            <LazyLoadErrorFallbackCompact
              error={error}
              resetErrorBoundary={reset}
              componentName="Help"
            />
          )}
        >
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading help...</div>}>
            <HelpWidget />
          </Suspense>
        </ErrorBoundary>
      </aside>
    </div>
  );
};

export default ExampleApp;

// ============================================================================
// ALTERNATIVE: Simplified pattern for smaller apps
// ============================================================================

/**
 * If you don't need all the features, here's a minimal setup:
 */

/*
import { lazyLoad } from '@/utils/lazyLoad';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LazyLoadErrorFallback } from '@/components/common/LazyLoadErrorFallback';

// Define components
const Dashboard = lazyLoad(() => import('./Dashboard'), 'Dashboard');
const Settings = lazyLoad(() => import('./Settings'), 'Settings');

// Render with error boundary
const SimpleApp = () => {
  const [view, setView] = useState('dashboard');

  return (
    <div>
      <nav>
        <button onClick={() => setView('dashboard')}>Dashboard</button>
        <button onClick={() => setView('settings')}>Settings</button>
      </nav>

      <main>
        <ErrorBoundary fallback={(error, reset) => (
          <LazyLoadErrorFallback
            error={error}
            resetErrorBoundary={reset}
            componentName={view}
          />
        )}>
          <Suspense fallback={<div>Loading...</div>}>
            {view === 'dashboard' && <Dashboard />}
            {view === 'settings' && <Settings />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};
*/

// ============================================================================
// TESTING: Simulate chunk load failures in development
// ============================================================================

/**
 * To test error handling in development:
 *
 * 1. Open Chrome DevTools → Network tab
 * 2. Set throttling to "Offline"
 * 3. Navigate to a lazy-loaded route
 * 4. You should see the retry logic in console
 * 5. Then see the error fallback after retries exhausted
 *
 * Or programmatically:
 */

/*
// In your component file, temporarily break the import:
const BrokenComponent = lazyLoad(
  () => Promise.reject(new Error('Simulated chunk load failure')),
  'BrokenComponent'
);
*/
