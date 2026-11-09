import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { NodeAuthProvider } from './context/NodeAuthContext';

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#020205', color: '#22d3ee', padding: '40px', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginBottom: '12px' }}>INNOVA NODE RECOVERY</h2>
          <pre style={{ background: '#090C15', padding: '16px', borderRadius: '12px', border: '1px solid rgba(34,211,238,0.3)', color: '#f87171', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
          <button
            onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '16px', padding: '10px 20px', background: '#06b6d4', color: '#000', fontWeight: 900, borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            Reset Local Cache &amp; Reload Node
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <NodeAuthProvider>
        <App />
      </NodeAuthProvider>
    </RootErrorBoundary>
  </StrictMode>,
);
