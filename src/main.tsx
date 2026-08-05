import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { NodeAuthProvider } from './context/NodeAuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NodeAuthProvider>
      <App />
    </NodeAuthProvider>
  </StrictMode>,
);