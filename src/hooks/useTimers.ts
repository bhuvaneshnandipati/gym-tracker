import { useContext } from 'react';
import { TimerActionsContext, TimerStateContext } from '@/contexts/timer-context';

/** Live timer readings (re-renders while a timer runs). Must be used inside TimerProvider. */
export function useTimerState() {
  const context = useContext(TimerStateContext);
  if (!context) {
    throw new Error('useTimerState must be used within a TimerProvider');
  }
  return context;
}

/** Stable timer controls (never re-renders on ticks). Must be used inside TimerProvider. */
export function useTimerActions() {
  const context = useContext(TimerActionsContext);
  if (!context) {
    throw new Error('useTimerActions must be used within a TimerProvider');
  }
  return context;
}
