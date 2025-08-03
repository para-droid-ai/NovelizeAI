
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new-project" element={<NewProjectPage />} />
        <Route path="/project/:projectId" element={<ProjectDashboardPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
};

export default App;
