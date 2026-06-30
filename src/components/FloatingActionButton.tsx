import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Floating action button for the primary action: starting a workout.
 * Sits above the mobile nav and bottom-right on desktop.
 */
export function FloatingActionButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate('/workout/new')}
      aria-label="Start a new workout"
      className="fixed bottom-20 right-5 z-30 flex h-14 items-center gap-2 rounded-full bg-flame-600 px-5 text-white shadow-fab transition-transform hover:bg-flame-700 active:scale-95 lg:bottom-8 lg:right-8"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
      <span className="hidden text-sm font-semibold sm:inline">New workout</span>
    </button>
  );
}
