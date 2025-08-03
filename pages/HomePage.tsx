import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useUser } from '../contexts/UserContext';
import ProjectCard from '../components/ProjectCard';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { NovelProject, GlobalContextLogEntry } from '../types';
import Input from '../components/Input';
import Select from '../components/Select';

const GlobalContextLogManager: React.FC = () => {
    const { userState, addLogEntry, deleteLogEntry } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    
    const [newEntry, setNewEntry] = useState({
        projectName: '',
        type: 'characterName' as GlobalContextLogEntry['type'],
        element: '',
        role: ''
    });

    const handleAddEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEntry.element || !newEntry.projectName) {
            alert("Project Name and Element are required to add a manual entry.");
            return;
        }
        addLogEntry({
            projectName: newEntry.projectName,
            type: newEntry.type,
            element: newEntry.element,
            role: newEntry.role || undefined,
        });
        setNewEntry({
            projectName: '',
            type: 'characterName',
            element: '',
            role: ''
        });
    };

    const sortedLog = userState?.globalContextLog.sort((a,b) => a.projectName.localeCompare(b.projectName) || a.type.localeCompare(b.type)) || [];

    return (
        <div className="bg-slate-800 rounded-lg shadow-lg mb-8">
            <button
                className="w-full flex justify-between items-center p-4 hover:bg-slate-700/50 transition-colors rounded-t-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 mr-3 text-sky-400">
                        <path d="M10 2a.75.75 0 0 1 .75.75v.518a3.745 3.745 0 0 1 2.23 2.231h.518a.75.75 0 0 1 0 1.5h-.518a3.745 3.745 0 0 1-2.23 2.231v.518a.75.75 0 0 1-1.5 0v-.518a3.745 3.745 0 0 1-2.23-2.231H6.018a.75.75 0 0 1 0-1.5h.518A3.745 3.745 0 0 1 8.78 3.268V2.75A.75.75 0 0 1 10 2ZM10 4.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
                        <path d="M15.992 7.843a.75.75 0 0 1 .687.822l-1.027 5.187a.75.75 0 0 1-1.472-.292l1.027-5.187a.75.75 0 0 1 .785-.53Zm-12 0a.75.75 0 0 1 .785.53l1.027 5.187a.75.75 0 1 1-1.472.292L3.313 8.665a.75.75 0 0 1 .687-.822ZM10 15.25a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 0 1.5H10.75a.75.75 0 0 1-.75-.75Z" />
                    </svg>
                    <span className="font-semibold text-lg text-sky-400">Global Context Log</span>
                </div>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {isOpen && (
                <div className="p-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400 mb-4">This log contains creative elements from all your projects. The AI uses this as a negative constraint to avoid repetition when generating a new novel plan. You can manually add or remove entries here.</p>
                    
                    <div className="max-h-72 overflow-y-auto bg-slate-900 p-3 rounded-md mb-4">
                        {sortedLog.length > 0 ? sortedLog.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between text-sm p-2 border-b border-slate-700 last:border-b-0 hover:bg-slate-800/50 rounded">
                                <div>
                                    <span className="font-semibold text-sky-300">{entry.element}</span>
                                    <span className="text-slate-400 mx-2">|</span>
                                    <span className="italic text-slate-300 capitalize">{entry.type.replace('Name', ' Name')}</span>
                                    {entry.role && <span className="text-slate-400"> ({entry.role})</span>}
                                    <span className="block text-xs text-slate-500">
                                      From: {entry.projectName}{entry.projectId === 'manual' ? '' : ` (${entry.projectId.substring(0, 8)})`}
                                    </span>
                                </div>
                                <button onClick={() => deleteLogEntry(entry.id)} className="text-red-500 hover:text-red-400 p-1" aria-label={`Delete entry ${entry.element}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3V3.25a.75.75 0 0 0-.75-.75h-1.5Z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        )) : <p className="text-slate-500 italic text-center p-4">Global context log is empty.</p>}
                    </div>

                    <form onSubmit={handleAddEntry} className="bg-slate-800/50 p-3 rounded-md">
                        <h4 className="text-md font-semibold text-sky-300 mb-2">Add Manual Entry</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                           <Input
                             label="Project Name"
                             value={newEntry.projectName}
                             onChange={e => setNewEntry({...newEntry, projectName: e.target.value})}
                             placeholder="E.g., My Sci-Fi Epic"
                             containerClassName="mb-0"
                             required
                           />
                           <Select
                                label="Type"
                                value={newEntry.type}
                                onChange={e => setNewEntry({...newEntry, type: e.target.value as GlobalContextLogEntry['type']})}
                                options={[
                                    { value: 'characterName', label: 'Character Name' },
                                    { value: 'coreConcept', label: 'Core Concept' },
                                    { value: 'keyTrope', label: 'Key Trope' },
                                    { value: 'setting', label: 'Setting' },
                                ]}
                                containerClassName="mb-0"
                            />
                            <Input
                                label="Element"
                                value={newEntry.element}
                                onChange={e => setNewEntry({...newEntry, element: e.target.value})}
                                placeholder="E.g., Aris Thorne"
                                containerClassName="mb-0"
                                required
                            />
                            <Input
                                label="Role (Optional)"
                                value={newEntry.role}
                                onChange={e => setNewEntry({...newEntry, role: e.target.value})}
                                placeholder="E.g., Protagonist"
                                containerClassName="mb-0"
                            />
                        </div>
                        <div className="flex justify-end mt-3">
                            <Button type="submit" size="sm" variant="primary">Add Entry</Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};


const HomePage: React.FC = () => {
  const { 
    projects, 
    isLoading, 
    error, 
    fetchProjects, 
    deleteProjectContext, 
    clearError, 
    setActiveProjectExplicitly,
    importProject 
  } = useProject();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);


  useEffect(() => {
    setActiveProjectExplicitly(null); 
    fetchProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleDelete = (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      deleteProjectContext(projectId);
    }
  };

  const handleImportClick = () => {
    setImportError(null);
    setImportSuccess(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setImportError(null);
    setImportSuccess(null);

    let totalImportedCount = 0;
    const importErrors: string[] = [];

    const readFileAsText = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Error reading file: ${file.name}`));
        reader.readAsText(file);
      });
    };

    for (const file of Array.from(files)) {
      try {
        const text = await readFileAsText(file);
        if (!text) {
          throw new Error(`File "${file.name}" is empty or could not be read.`);
        }
        const data = JSON.parse(text);

        const projectsToImport: NovelProject[] = [];
        if (Array.isArray(data)) {
          if (data.length === 0) {
            throw new Error(`File "${file.name}" contains an empty array of projects.`);
          }
          projectsToImport.push(...data);
        } else if (typeof data === 'object' && data !== null && 'id' in data) {
          projectsToImport.push(data);
        } else {
          throw new Error(`File "${file.name}" has an invalid format. Expected a single project object or an array of projects.`);
        }

        for (const projectData of projectsToImport) {
          if (typeof projectData !== 'object' || projectData === null || !projectData.id || !projectData.title) {
            throw new Error(`An item in file "${file.name}" is not a valid project object.`);
          }
          const success = await importProject(projectData);
          if (!success) {
            throw new Error(`Import failed for project "${projectData.title || 'Untitled'}" from file "${file.name}".`);
          }
        }
        totalImportedCount += projectsToImport.length;
      } catch (err: any) {
        console.error(`Error importing from file "${file.name}":`, err);
        importErrors.push(err.message);
      }
    }

    if (totalImportedCount > 0) {
      setImportSuccess(`Successfully imported ${totalImportedCount} project(s).`);
    }
    if (importErrors.length > 0) {
      setImportError(`Import process completed with errors:\n- ${importErrors.join('\n- ')}`);
    }

    if (event.target) {
      event.target.value = '';
    }
  };
  
  if (isLoading && projects.length === 0) { 
    return <div className="flex justify-center items-center h-64"><LoadingSpinner text="Loading projects..." size="lg" /></div>;
  }

  if (error && projects.length === 0) { // Show general error if projects couldn't be loaded initially
    return (
      <div className="text-center p-8 bg-red-900/30 rounded-md">
        <h2 className="text-2xl font-semibold text-red-400 mb-4">Error Loading Projects</h2>
        <p className="text-red-300 mb-4">{error}</p>
        <Button onClick={() => { clearError(); fetchProjects(); }} variant="danger">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-sky-300 mb-4 sm:mb-0 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 mr-3 text-sky-400">
            <path d="M19 2H5C3.89543 2 3 2.89543 3 4V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V4C21 2.89543 20.1046 2 19 2ZM19 20H5V4H7V18L9.5 16L12 18V4H19V20Z" />
          </svg>
          My Novel Projects
        </h1>
        <div className="flex space-x-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelected} 
            style={{ display: 'none' }} 
            accept=".json" 
            multiple
          />
          <Button onClick={handleImportClick} variant="outline">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25" />
            </svg>
            Import Project(s) (.json)
          </Button>
          <Link to="/new-project">
            <Button variant="primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create New Novel
            </Button>
          </Link>
        </div>
      </div>
      
      {importError && (
        <div className="mb-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-sm whitespace-pre-wrap">
            <p className="font-semibold">Import Error:</p>
            <p>{importError}</p>
        </div>
      )}
      {importSuccess && (
        <div className="mb-4 p-3 bg-green-900/50 text-green-300 border border-green-700 rounded-md text-sm">
            <p className="font-semibold">Import Success:</p>
            <p>{importSuccess}</p>
        </div>
      )}
      {/* Display general context error if not related to import */}
      {error && !importError && (
         <div className="mb-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-sm">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
         </div>
      )}

      <GlobalContextLogManager />

      {projects.length === 0 && !isLoading ? (
        <div className="text-center py-12 bg-slate-800 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-500 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
          <p className="text-xl text-slate-400 mb-2">No projects yet.</p>
          <p className="text-slate-500 mb-6">Start your literary journey by creating a new novel or importing an existing one.</p>
          <Link to="/new-project">
            <Button variant="primary" size="lg">Get Started</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map((project) => (
            <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
          ))}
        </div>
      )}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default HomePage;