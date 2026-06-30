import { useContext } from 'react';
import { ToastContext } from '@/contexts/toast-context';

/** Access toast notifications. Must be used inside ToastProvider. */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
