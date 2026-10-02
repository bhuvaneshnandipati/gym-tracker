import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { App } from '@/App';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { AuthProvider } from '@/contexts/AuthProvider';
import { ToastProvider } from '@/contexts/ToastProvider';
import { TimerProvider } from '@/contexts/TimerProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MissingSupabaseConfig } from '@/components/MissingSupabaseConfig';
import { initTheme } from '@/lib/theme-init';
import { isSupabaseConfigured } from '@/lib/env';
import { queryClient } from '@/lib/queryClient';
import '@/styles/index.css';

// Apply the saved theme before the first paint to avoid a flash.
initTheme();

// Persist the query cache to localStorage so previously-loaded data is
// available offline and across reloads.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'gym-tracker:query-cache',
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          {isSupabaseConfigured ? (
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
            >
              <AuthProvider>
                <TimerProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </TimerProvider>
              </AuthProvider>
            </PersistQueryClientProvider>
          ) : (
            <MissingSupabaseConfig />
          )}
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
