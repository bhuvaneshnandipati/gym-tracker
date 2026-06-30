import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches render-time errors so the whole app doesn't blank out. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production this is where you'd report to an error service.
    console.error('Unhandled error:', error, info);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="text-xl font-semibold text-iron-900 dark:text-iron-50">
            Something went wrong
          </h1>
          <p className="mt-1 max-w-sm text-sm text-iron-500 dark:text-iron-400">
            An unexpected error occurred. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-flame-600 px-4 text-sm font-medium text-white transition-colors hover:bg-flame-700"
          >
            Reload app
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
