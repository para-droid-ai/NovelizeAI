
import { NovelProject, NovelIdea, ChapterContent, SourceDataFile } from '../types';
import { DEFAULT_GEMINI_TEXT_MODEL } from '../constants';

const PROJECTS_KEY_OLD = 'novelCreatorProjects';
const PROJECT_IDS_KEY = 'novelCreatorProjectIds_v2';
const PROJECT_ITEM_PREFIX = 'novelProject_';

const getProjectIds = (): string[] => {
  try {
    const idsJson = localStorage.getItem(PROJECT_IDS_KEY);
    return idsJson ? JSON.parse(idsJson) : [];
  } catch (error) {
    console.error("Error reading project IDs from localStorage:", error);
    return [];
  }
};

const saveProjectIds = (ids: string[]): void => {
  try {
    localStorage.setItem(PROJECT_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("Error saving project IDs to localStorage:", error);
  }
};

const migrateFromOldFormat = (): void => {
  // Check if migration is needed: old key exists and new key doesn't
  const oldDataJson = localStorage.getItem(PROJECTS_KEY_OLD);
  const newIdsJson = localStorage.getItem(PROJECT_IDS_KEY);

  if (oldDataJson && !newIdsJson) {
    console.log("Migrating project data to new format...");
    try {
      const oldProjects = JSON.parse(oldDataJson) as NovelProject[];
      const projectIds: string[] = [];
      
      oldProjects.forEach(project => {
        if (project && project.id) {
          localStorage.setItem(`${PROJECT_ITEM_PREFIX}${project.id}`, JSON.stringify(project));
          projectIds.push(project.id);
        }
      });

      saveProjectIds(projectIds);
      localStorage.removeItem(PROJECTS_KEY_OLD);
      console.log(`Migration successful. ${projectIds.length} projects migrated.`);
    } catch (e) {
      console.error("Failed to migrate old project data:", e);
      // Don't remove the old key if migration fails
    }
  }
};

// Run migration check once on service load
migrateFromOldFormat();

export const getProjects = (): NovelProject[] => {
  try {
    const projectIds = getProjectIds();
    const projects = projectIds.map(id => {
      const projectJson = localStorage.getItem(`${PROJECT_ITEM_PREFIX}${id}`);
      // Basic check for data corruption or missing item
      if (!projectJson) {
        console.warn(`Project data for ID ${id} not found in localStorage.`);
        return null;
      }
      return JSON.parse(projectJson) as NovelProject;
    }).filter((p): p is NovelProject => p !== null);
    
    // Ensure all projects have a selectedGlobalAIModel, defaulting if necessary
    return projects.map(p => ({
        ...p,
        selectedGlobalAIModel: p.selectedGlobalAIModel || DEFAULT_GEMINI_TEXT_MODEL
    }));
  } catch (error) {
    console.error("Error fetching projects from localStorage:", error);
    return [];
  }
};

export const getProjectById = (projectId: string): NovelProject | undefined => {
  try {
    const projectJson = localStorage.getItem(`${PROJECT_ITEM_PREFIX}${projectId}`);
    if (!projectJson) return undefined;
    const project = JSON.parse(projectJson) as NovelProject;
    if (project && !project.selectedGlobalAIModel) {
      project.selectedGlobalAIModel = DEFAULT_GEMINI_TEXT_MODEL;
    }
    return project;
  } catch (error) {
    console.error(`Error fetching project ${projectId} from localStorage:`, error);
    return undefined;
  }
};

export const saveProject = (projectToSave: NovelProject): NovelProject => {
  // Ensure the project has an ID
  if (!projectToSave.id) {
    throw new Error("Cannot save a project without an ID.");
  }
  
  // Work with a copy to avoid mutating the original object passed to the function
  const project = { 
      ...projectToSave,
      selectedGlobalAIModel: projectToSave.selectedGlobalAIModel || DEFAULT_GEMINI_TEXT_MODEL,
      updatedAt: new Date().toISOString(),
      createdAt: projectToSave.createdAt || new Date().toISOString(),
  };

  try {
    // Save the individual project object
    localStorage.setItem(`${PROJECT_ITEM_PREFIX}${project.id}`, JSON.stringify(project));

    // Update the list of IDs if it's a new project
    const projectIds = getProjectIds();
    if (!projectIds.includes(project.id)) {
      saveProjectIds([...projectIds, project.id]);
    }
  } catch (error) {
    const errorMessage = `Failed to save project "${project.title}". The project data may be too large for your browser's storage, or another storage error occurred.`;
    console.error(errorMessage, error);
    alert(errorMessage);
    throw error;
  }
  return project;
};

export const createNewProject = (title: string, idea: NovelIdea, selectedGlobalAIModel: string, sourceData?: SourceDataFile[]): NovelProject => {
  const newProject: NovelProject = {
    id: crypto.randomUUID(),
    title,
    idea,
    sourceData,
    chapters: [],
    currentChapterProcessing: 1,
    selectedGlobalAIModel: selectedGlobalAIModel || DEFAULT_GEMINI_TEXT_MODEL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return saveProject(newProject);
};

export const deleteProject = (projectId: string): void => {
  try {
    localStorage.removeItem(`${PROJECT_ITEM_PREFIX}${projectId}`);
    
    const projectIds = getProjectIds();
    const updatedIds = projectIds.filter(id => id !== projectId);
    saveProjectIds(updatedIds);
  } catch (error) {
    console.error("Error deleting project from localStorage:", error);
  }
};

export const addChapterToProject = (projectId: string, chapter: ChapterContent): NovelProject | undefined => {
  const project = getProjectById(projectId);
  if (project) {
    const existingChapterIndex = project.chapters.findIndex(c => c.chapterNumber === chapter.chapterNumber);
    if (existingChapterIndex > -1) {
        project.chapters[existingChapterIndex] = chapter;
    } else {
        project.chapters.push(chapter);
        project.chapters.sort((a,b) => a.chapterNumber - b.chapterNumber);
    }
    return saveProject(project);
  }
  return undefined;
};

export const updateChapterInProject = (projectId: string, chapterNumber: number, updates: Partial<ChapterContent>): NovelProject | undefined => {
    const project = getProjectById(projectId);
    if (project) {
        const chapterIndex = project.chapters.findIndex(c => c.chapterNumber === chapterNumber);
        if (chapterIndex > -1) {
            project.chapters[chapterIndex] = { ...project.chapters[chapterIndex], ...updates };
            return saveProject(project);
        } else {
            // If chapter doesn't exist, create it (this assumes chapterNumber is correct for a new chapter)
            const newChapter: ChapterContent = {
                chapterNumber: chapterNumber,
                plan: updates.plan || '',
                prose: updates.prose || '',
                review: updates.review || '',
                ...updates
            };
            project.chapters.push(newChapter);
            project.chapters.sort((a,b) => a.chapterNumber - b.chapterNumber);
            return saveProject(project);
        }
    }
    return undefined;
};
