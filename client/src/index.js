import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { BoardSettingsProvider } from './contexts/BoardSettingsContext';
import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="438652858045-9r90vj4o3b3ivojorb531q7pjnk5v1l8.apps.googleusercontent.com">
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <BoardSettingsProvider>
              <App />
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#1e1e2e',
                    color: '#fff',
                    border: '1px solid #333'
                  }
                }}
              />
            </BoardSettingsProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
