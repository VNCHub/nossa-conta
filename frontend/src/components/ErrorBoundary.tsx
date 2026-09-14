import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../observability';

interface State {
  crashed: boolean;
}

/**
 * A class component on purpose — React has no hook-based error boundary yet.
 * The fallback avoids Mantine (or anything else that could share the fault
 * that crashed the tree) so it renders no matter what broke.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error.message, error.stack ?? `${error.message}\n${info.componentStack}`);
  }

  render() {
    if (this.state.crashed) {
      return (
        <div
          style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            textAlign: 'center', padding: 24, fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p>Algo deu errado. Tente recarregar a página.</p>
          <button onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      );
    }
    return this.props.children;
  }
}
