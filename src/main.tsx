import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crash:', error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#07111f', color: '#e85d3f', padding: 40, fontFamily: 'monospace', minHeight: '100vh' }}>
          <h1 style={{ color: '#f2a33b', fontSize: 18 }}>SYSTALOG Terminal — Render Error</h1>
          <pre style={{ color: '#d4d4d8', fontSize: 12, marginTop: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
