import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { MongoAuthProvider } from './hooks/useMongoAuth';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MongoAuthProvider>
        <App />
      </MongoAuthProvider>
    </BrowserRouter>
  </StrictMode>
);