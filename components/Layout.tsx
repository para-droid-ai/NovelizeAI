
import React from 'react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen max-h-screen flex flex-col bg-slate-900 text-slate-100">
      <header className="flex-shrink-0 bg-slate-800 shadow-md z-20">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-sky-400 hover:text-sky-300 transition-colors">
            Novelize AI
          </Link>
          <div>
            <Link to="/" className="px-3 py-2 text-slate-300 hover:text-sky-400 transition-colors rounded-md">
              My Projects
            </Link>
            <Link
              to="/new-project"
              className="ml-4 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-md shadow-sm transition-colors"
            >
              New Novel
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-grow overflow-y-auto">
        {children}
      </main>
      <footer className="flex-shrink-0 bg-slate-800 text-center py-4 text-sm text-slate-400">
        © {new Date().getFullYear()} Novelize AI. Harnessing the power of Gemini.
      </footer>
    </div>
  );
};

export default Layout;