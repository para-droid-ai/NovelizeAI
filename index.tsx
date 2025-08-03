
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ProjectProvider } from './contexts/ProjectContext';
import { UserProvider } from './contexts/UserContext';
import { HashRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <UserProvider>
        <ProjectProvider>
          <App />
        </ProjectProvider>
      </UserProvider>
    </HashRouter>
  </React.StrictMode>
);
