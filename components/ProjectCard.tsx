
import React from 'react';
import { Link } from 'react-router-dom';
import { NovelProject } from '../types';
import Button from './Button';

interface ProjectCardProps {
  project: NovelProject;
  onDelete: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
  const chapterCount = project.chapters.length;
  const lastUpdated = new Date(project.updatedAt).toLocaleDateString();

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl p-6 hover:shadow-sky-500/30 transition-shadow duration-300 flex flex-col justify-between">
      <div>
        <h3 className="text-xl font-semibold text-sky-400 mb-2">{project.title}</h3>
        <p className="text-sm text-slate-400 mb-1">Genre: {project.idea.genre}</p>
        <p className="text-sm text-slate-400 mb-1">Chapters: {chapterCount}</p>
        <p className="text-sm text-slate-400 mb-4">Last Updated: {lastUpdated}</p>
        <p className="text-sm text-slate-300 line-clamp-3 mb-4">
          {project.idea.initialIdea || "No initial idea provided."}
        </p>
      </div>
      <div className="mt-auto flex space-x-2">
        <Link to={`/project/${project.id}`} className="flex-grow">
          <Button variant="primary" size="sm" fullWidth>
            Open Project
          </Button>
        </Link>
        <Button variant="danger" size="sm" onClick={() => onDelete(project.id)} className="px-3" aria-label="Delete project">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75H4.5a.75.75 0 0 0 0 1.5h11a.75.75 0 0 0 0-1.5H14A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.531.646 1.718 1.475H8.282A1.751 1.751 0 0 1 10 4ZM7.5 6.575A.5.5 0 0 1 8 6h4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H8a.5.5 0 0 1-.5-.5v-7Z" clipRule="evenodd" />
            <path d="M4.5 6.5A.5.5 0 0 1 5 6h10a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5v-7Z" />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export default ProjectCard;