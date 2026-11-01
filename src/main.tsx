import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
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

// App data now lives in the on-device store (src/lib/localStore.ts). Remove the
// old persisted query cache, which is no longer used.
try {
  window.localStorage.removeItem('gym-tracker:query-cache');
} catch {
  // Ignore storage errors.
}

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
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <TimerProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </TimerProvider>
              </AuthProvider>
            </QueryClientProvider>
          ) : (
            <MissingSupabaseConfig />
          )}
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
