import React, { useState, useCallback, Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/StepCard";
import { ClientSelector } from "@/components/ClientSelector";
import { ProgressOverview } from "@/components/ProgressOverview";
import { QuickActions } from "@/components/QuickActions";
import { PageLayout } from "@/components/layout/PageLayout";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useIndustry } from '@/contexts/IndustryContext';
import {
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  DollarSign,
  MapPin,
  Headphones,
  ThumbsUp,
  Repeat
} from "lucide-react";
import { defaultClients, stepData } from "@/data/clientData";
import { useClients, useClientSteps, DatabaseClient } from "@/hooks/useClients";

// Utility function to retry lazy loading with exponential backoff
const lazyWithRetry = (
  componentImport: () => Promise<any>,
  componentName: string,
  retries = 3,
  interval = 1000
) => {
  return lazy(() => {
    return new Promise((resolve, reject) => {
      const attemptLoad = (attemptsLeft: number, delay: number) => {
        componentImport()
          .then(resolve)
          .catch((error) => {
            if (attemptsLeft === 0) {
              console.error(`Failed to load ${componentName} after ${retries} retries`, error);
              reject(error);
              return;
            }

            console.warn(
              `Retrying ${componentName} load... (${retries - attemptsLeft + 1}/${retries})`,
              error
            );

            setTimeout(() => {
              attemptLoad(attemptsLeft - 1, delay * 2);
            }, delay);
          });
      };

      attemptLoad(retries, interval);
    });
  });
};

// Lazy load heavy components with retry logic
// If these are default exports, simplify to: lazy(() => import('@/components/ClientDetailView'))
const ClientDetailView = lazyWithRetry(
  () => import('@/components/ClientDetailView').then(m => ({ default: m.ClientDetailView })),
  'ClientDetailView'
);

const ClientDashboard = lazyWithRetry(
  () => import('@/components/ClientDashboard').then(m => ({ default: m.ClientDashboard })),
  'ClientDashboard'
);

const GroupBookingManager = lazyWithRetry(
  () => import('@/components/GroupBookingManager').then(m => ({ default: m.GroupBookingManager })),
  'GroupBookingManager'
);

const AIAssistant = lazyWithRetry(
  () => import('@/components/AIAssistant').then(m => ({ default: m.AIAssistant })),
  'AIAssistant'
);

const AnalyticsDashboard = lazyWithRetry(
  () => import('@/components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })),
  'AnalyticsDashboard'
);

const AdvancedWorkflowManager = lazyWithRetry(
  () => import('@/components/AdvancedWorkflowManager').then(m => ({ default: m.AdvancedWorkflowManager })),
  'AdvancedWorkflowManager'
);

const IntegrationHub = lazyWithRetry(
  () => import('@/components/IntegrationHub').then(m => ({ default: m.IntegrationHub })),
  'IntegrationHub'
);

const SecurityCenter = lazyWithRetry(
  () => import('@/components/SecurityCenter').then(m => ({ default: m.SecurityCenter })),
  'SecurityCenter'
);

const SubscriptionManager = lazyWithRetry(
  () => import('@/components/SubscriptionManager').then(m => ({ default: m.SubscriptionManager })),
  'SubscriptionManager'
);

// Lazy load ClientsList as it's only used in one view
const ClientsList = lazyWithRetry(
  () => import('@/components/ClientsList').then(m => ({ default: m.ClientsList })),
  'ClientsList'
);

const stepIcons = [
  FileText,
  MessageSquare,
  DollarSign,
  MapPin,
  FileText,
  Headphones,
  ThumbsUp,
  Repeat
];

// Preload components based on user behavior
const preloadComponent = (componentName: string) => {
  const preloadMap: Record<string, () => void> = {
    'client-dashboard': () => {
      // Preload both ClientDetailView and ClientDashboard
      import('@/components/ClientDetailView');
      import('@/components/ClientDashboard');
    },
    'clients': () => {
      import('@/components/ClientsList');
    },
    'group-bookings': () => {
      import('@/components/GroupBookingManager');
    },
    'ai-assistant': () => {
      import('@/components/AIAssistant');
    },
    'analytics': () => {
      import('@/components/AnalyticsDashboard');
    },
    'workflows': () => {
      import('@/components/AdvancedWorkflowManager');
    },
    'integrations': () => {
      import('@/components/IntegrationHub');
    },
    'security': () => {
      import('@/components/SecurityCenter');
    },
    'subscription': () => {
      import('@/components/SubscriptionManager');
    },
  };

  preloadMap[componentName]?.();
};

// Error fallback component for lazy loading failures
const LazyLoadErrorFallback = ({
  error,
  resetErrorBoundary,
  componentName
}: {
  error: Error;
  resetErrorBoundary: () => void;
  componentName: string;
}) => (
  <div className="text-center py-12">
    <h2 className="text-xl lg:text-2xl font-bold text-destructive mb-4">
      Failed to Load {componentName}
    </h2>
    <p className="text-muted-foreground mb-6">
      {error.message || 'An error occurred while loading this component.'}
    </p>
    <div className="space-x-4">
      <Button onClick={resetErrorBoundary} variant="default">
        Try Again
      </Button>
      <Button onClick={() => window.location.reload()} variant="outline">
        Reload Page
      </Button>
    </div>
  </div>
);

const Index = () => {
  // Initialize view from URL parameter if present
  const urlParams = new URLSearchParams(window.location.search);
  const initialView = urlParams.get('view') || 'dashboard';
  const [currentView, setCurrentView] = useState(initialView);
  const [selectedClient, setSelectedClient] = useState<DatabaseClient | null>(null);
  const [showClientDetail, setShowClientDetail] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { terminology } = useIndustry();
  const { clients, loading: clientsLoading } = useClients();
  const { steps: clientSteps, updateStep } = useClientSteps(selectedClient?.id || '');

  const handleStepClick = useCallback((stepNumber: number) => {
    toast({
      title: `Step ${stepNumber} clicked`,
      description: `${stepData[stepNumber - 1].title} - Feature available in full app!`,
    });
  }, [toast]);

  const handleNewClient = useCallback(() => {
    setCurrentView('clients');
    // Preload clients list component
    preloadComponent('clients');
  }, []);

  const handleClientSelect = useCallback((currentClient: any) => {
    if ('agent_id' in currentClient) {
      setSelectedClient(currentClient);
      setShowClientDetail(true);
      // Preload client dashboard component
      preloadComponent('client-dashboard');
    } else {
      toast({
        title: `${terminology.client} Dashboard`,
        description: `Please add real ${terminology.clients.toLowerCase()} to view detailed dashboard`,
      });
    }
    setCurrentView('client-dashboard');
  }, [toast, terminology]);

  const handleViewChange = useCallback((view: string) => {
    // Preload component for the target view
    preloadComponent(view);

    setCurrentView(view);
    // Update URL parameter to maintain state on refresh
    const url = new URL(window.location.href);
    if (view === 'dashboard') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', view);
    }
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleBackToHome = useCallback(() => {
    setCurrentView('dashboard');
  }, []);

  const handleGoToClients = useCallback(() => {
    setCurrentView('clients');
    preloadComponent('clients');
  }, []);

  const handleGoToClientDashboard = useCallback(() => {
    setCurrentView('client-dashboard');
    preloadComponent('client-dashboard');
  }, []);

  const handleScheduleFollowup = useCallback(() => {
    toast({
      title: "Schedule Follow-up",
      description: "Calendar integration coming soon!",
    });
  }, [toast]);

  const handleUpdateStep = useCallback((stepNumber: number, completed: boolean) => {
    if (!selectedClient) return;

    updateStep(stepNumber, completed);
    toast({
      title: completed ? "Step completed" : "Step marked as incomplete",
      description: `${stepData[stepNumber - 1].title} has been updated`,
    });
  }, [selectedClient, updateStep, toast]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-4 lg:space-y-8">
            <div className="max-w-7xl mx-auto space-y-4 lg:space-y-8">
              {/* Header */}
              <div className="text-center space-y-2 lg:space-y-4">
                <h1 className="text-2xl lg:text-4xl font-bold text-foreground">
                  Welcome back, {userProfile?.full_name || 'User'}!
                </h1>
                <p className="text-lg lg:text-xl text-muted-foreground">
                  Track and manage your {terminology.client.toLowerCase()} progress through the complete {terminology.experience.toLowerCase()} experience
                </p>
              </div>

              {/* Progress Overview */}
              <ProgressOverview completedSteps={clientSteps.filter(s => s.completed).length} totalSteps={8} />

              {/* Client Selector */}
              <ClientSelector
                clients={clientsLoading ? [] : clients.map(c => ({
                  ...c,
                  steps: clientSteps.map(s => s.completed),
                  travelDate: c.travel_date || '',
                }))}
                currentClientIndex={selectedClient && !clientsLoading ?
                  Math.max(0, clients.findIndex(c => c.id === selectedClient.id)) : 0}
                onClientChange={(index) => {
                  if (!clientsLoading && clients && clients[index]) {
                    setSelectedClient(clients[index]);
                  }
                }}
              />

              {/* Step Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                {stepData.map((step, index) => {
                  const IconComponent = stepIcons[index];
                  const isCompleted = clientSteps.find((_, i) => i === index)?.completed || false;
                  const isActive = !isCompleted && (index === 0 || (clientSteps.find((_, i) => i === index - 1)?.completed || false));

                  return (
                    <StepCard
                      key={step.id}
                      stepNumber={step.id}
                      title={step.title}
                      description={step.description}
                      status={isCompleted ? "completed" : isActive ? "active" : "pending"}
                      icon={<IconComponent className="h-6 w-6" />}
                      onClick={() => handleStepClick(step.id)}
                    />
                  );
                })}
              </div>

              {/* Quick Actions */}
              <QuickActions
                onNewClient={handleNewClient}
                onViewDashboard={handleGoToClientDashboard}
                onScheduleFollowup={handleScheduleFollowup}
              />
            </div>
          </div>
        );

      case 'clients':
        return (
          <div className="space-y-4 lg:space-y-6">
            <div className="mb-4 lg:mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{terminology.client} Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage your {terminology.clients.toLowerCase()} and track their journey progress
              </p>
            </div>
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
                <ClientsList
                  onSelectClient={(client) => {
                    setSelectedClient(client);
                    setShowClientDetail(true);
                    setCurrentView('client-dashboard');
                  }}
                  selectedClientId={selectedClient?.id}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        );

      case 'client-dashboard':
        if (showClientDetail && selectedClient) {
          return (
            <ErrorBoundary
              fallback={(error, reset) => (
                <LazyLoadErrorFallback
                  error={error}
                  resetErrorBoundary={reset}
                  componentName="Client Details"
                />
              )}
            >
              <Suspense fallback={<LoadingSpinner size="lg" text="Loading client details..." />}>
                <ClientDetailView
                  client={selectedClient}
                  onBack={() => {
                    setShowClientDetail(false);
                    setCurrentView('clients');
                  }}
                />
              </Suspense>
            </ErrorBoundary>
          );
        } else if (selectedClient) {
          return (
            <div className="p-3 lg:p-6">
              <div className="max-w-6xl mx-auto">
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
                    <ClientDashboard
                      client={{
                        ...selectedClient,
                        steps: clientSteps.map(step => step.completed),
                        lastContact: selectedClient.last_contact || '',
                        travelDate: selectedClient.travel_date || '',
                      }}
                      onEditClient={() => toast({ title: "Edit client", description: "Feature coming soon!" })}
                      onCreateItinerary={() => toast({ title: "Create itinerary", description: "Feature coming soon!" })}
                      onEditItinerary={() => toast({ title: "Edit itinerary", description: "Feature coming soon!" })}
                      onSendEmail={() => toast({ title: "Send email", description: "Feature coming soon!" })}
                      onUpdateStep={handleUpdateStep}
                      onBackToHome={handleBackToHome}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          );
        } else {
          return (
            <div className="text-center py-12">
              <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">No {terminology.client} Selected</h2>
              <p className="text-muted-foreground mb-6">
                Please select a {terminology.client.toLowerCase()} to view their dashboard.
              </p>
              <Button
                onClick={handleGoToClients}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Go to {terminology.clients}
              </Button>
            </div>
          );
        }

      case 'group-bookings':
        return (
          <div className="space-y-4 lg:space-y-6">
            <div className="mb-4 lg:mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Group Bookings</h1>
              <p className="text-muted-foreground mt-1">
                Manage group bookings and coordinate multiple participants
              </p>
            </div>
            <ErrorBoundary
              fallback={(error, reset) => (
                <LazyLoadErrorFallback
                  error={error}
                  resetErrorBoundary={reset}
                  componentName="Group Booking Manager"
                />
              )}
            >
              <Suspense fallback={<LoadingSpinner size="lg" text="Loading group bookings..." />}>
                <GroupBookingManager />
              </Suspense>
            </ErrorBoundary>
          </div>
        );

      case 'ai-assistant':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="AI Assistant"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading AI assistant..." />}>
              <AIAssistant />
            </Suspense>
          </ErrorBoundary>
        );

      case 'workflows':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Workflow Manager"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading workflows..." />}>
              <AdvancedWorkflowManager />
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
                componentName="Analytics Dashboard"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading analytics..." />}>
              <AnalyticsDashboard />
            </Suspense>
          </ErrorBoundary>
        );

      case 'integrations':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Integration Hub"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading integrations..." />}>
              <IntegrationHub />
            </Suspense>
          </ErrorBoundary>
        );

      case 'security':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Security Center"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading security center..." />}>
              <SecurityCenter />
            </Suspense>
          </ErrorBoundary>
        );

      case 'subscription':
        return (
          <ErrorBoundary
            fallback={(error, reset) => (
              <LazyLoadErrorFallback
                error={error}
                resetErrorBoundary={reset}
                componentName="Subscription Manager"
              />
            )}
          >
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading subscription..." />}>
              <SubscriptionManager />
            </Suspense>
          </ErrorBoundary>
        );

      case 'portal':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">Client Portal Manager</h2>
            <p className="text-muted-foreground mb-6">
              Manage client portal access and settings.
            </p>
            <Button
              onClick={handleBackToHome}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Back to Dashboard
            </Button>
          </div>
        );

      case 'api-management':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">API Management</h2>
            <p className="text-muted-foreground mb-6">
              Manage API keys and integrations.
            </p>
            <Button
              onClick={handleBackToHome}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Back to Dashboard
            </Button>
          </div>
        );

      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">Settings</h2>
            <p className="text-muted-foreground mb-6">
              Configure your account and application settings.
            </p>
            <Button
              onClick={handleBackToHome}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Back to Dashboard
            </Button>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-4">Feature Coming Soon</h2>
            <p className="text-muted-foreground mb-6">
              This section is currently under development.
            </p>
            <Button
              onClick={handleBackToHome}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Back to Dashboard
            </Button>
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <PageLayout
        currentView={currentView}
        onViewChange={handleViewChange}
        title="Travel Addicts"
      >
        {renderContent()}
      </PageLayout>
    </ErrorBoundary>
  );
};

export default Index;
