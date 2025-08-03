

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { NovelProject, ChapterContent, InitialAISetupPlan, NovelIdea, IdeaSparkSuggestions, ProcessStage, ChapterOutline, GlobalContextLogEntry, TimeLog, SystemLogEntry, SourceDataFile } from '../types';
import *  as ProjectService from '../services/projectService'; // Ensure named import
import *  as GeminiService from '../services/geminiService'; // Ensure named import
import { useUser } from './UserContext'; // NEW
import { TARGET_NOVEL_LENGTHS, POVS, POINT_OF_VIEW_TENSES, PROSE_COMPLEXITY_OPTIONS, PACING_OPTIONS, CHARACTER_COUNTS, DEFAULT_GEMINI_TEXT_MODEL } from '../constants';
import { formatDurationShort } from '../src/utils/timeUtils';

const MAX_AUTO_REVISIONS_PER_CHAPTER = 1;

interface ProjectContextType {
  projects: NovelProject[];
  activeProject: NovelProject | null;
  isLoading: boolean;
  error: string | null;
  setError: (message: string | null) => void;
  fetchProjects: () => void;
  loadProject: (projectId: string) => void;
  createNewProject: (title: string, idea: NovelIdea, selectedGlobalAIModel: string, sourceFiles: File[]) => Promise<NovelProject | null>;
  deleteProjectContext: (projectId: string) => void;
  updateProjectData: (updatedData: Partial<NovelProject>) => Promise<void>;
  
  generateInitialPlan: (rewriteContext?: string) => Promise<void>;
  generateChapterPlan: (chapterNumber: number, planRevisionFeedback?: string) => Promise<void>;
  generateChapterProse: (chapterNumber: number, proseRevisionFeedback?: string) => Promise<void>;
  generateChapterReview: (chapterNumber: number, reviewRevisionFeedback?: string) => Promise<GeminiService.ParsedChapterReview | null>;
  reviseChapter: (chapterNumber: number, userFeedback: string) => Promise<void>;
  updateChapterTitle: (chapterNumber: number, newTitle: string) => Promise<void>; 
  updateSelectedGlobalAIModel: (modelName: string) => Promise<void>;
  
  rewriteInitialPlan: (context: string) => Promise<void>;
  rewriteChapterPlan: (chapterNumber: number, context: string) => Promise<void>;
  rewriteChapterProse: (chapterNumber: number, context: string) => Promise<void>;
  rewriteChapterReview: (chapterNumber: number, context: string) => Promise<void>;

  clearError: () => void;
  setActiveProjectExplicitly: (project: NovelProject | null) => void;

  ideaSparkSuggestions: IdeaSparkSuggestions | null;
  isSuggestingModifiers: boolean;
  fetchIdeaSparkSuggestions: (initialIdeaText: string, modelForSpark: string, sourceFiles: File[], currentUserGenre?: string, currentUserSubGenre?: string) => Promise<void>;
  clearIdeaSparkSuggestions: () => void;

  importProject: (projectData: NovelProject) => Promise<boolean>;

  isAutoModeActive: boolean;
  isAutoModePaused: boolean;
  autoModeStatusMessage: string | null;
  toggleAutoMode: () => void;
  pauseAutoMode: () => void;
  resumeAutoMode: () => void;
  autoRevisionsAttempted: { [chapterNumber: number]: number };

  isAITaskRunning: boolean;
  timerSeconds: number;
  currentAITaskMessage: string | null; // NEW
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<NovelProject[]>([]);
  const [activeProject, setActiveProject] = useState<NovelProject | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [ideaSparkSuggestions, setIdeaSparkSuggestions] = useState<IdeaSparkSuggestions | null>(null);
  const [isSuggestingModifiers, setIsSuggestingModifiers] = useState<boolean>(false);

  const [isAutoModeActive, setIsAutoModeActive] = useState<boolean>(false);
  const [isAutoModePaused, setIsAutoModePaused] = useState<boolean>(false);
  const [autoModeStatusMessage, setAutoModeStatusMessage] = useState<string | null>(null);
  const [autoRevisionsAttempted, setAutoRevisionsAttempted] = useState<{ [chapterNumber: number]: number }>({});

  const [isAITaskRunning, setIsAITaskRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentAITaskMessage, setCurrentAITaskMessage] = useState<string | null>(null); // NEW

  const { logGlobalElements, getGlobalContextAsString } = useUser();

  const addLogEntry = useCallback((message: string) => {
    setActiveProject(prev => {
        if (!prev) return null;
        const newLogEntry: SystemLogEntry = { timestamp: Date.now(), message };
        const newLog = [...(prev.systemLog || []), newLogEntry];
        if (newLog.length > 200) { // Limit log size to prevent bloat
            newLog.splice(0, newLog.length - 200);
        }
        return { ...prev, systemLog: newLog };
    });
  }, []);

  useEffect(() => {
    let interval: number | null = null;
    if (isAITaskRunning) {
        interval = window.setInterval(() => {
            setTimerSeconds(seconds => seconds + 1);
        }, 1000);
    } else {
        setTimerSeconds(0);
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [isAITaskRunning]);


  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const fetchProjects = useCallback(() => {
    setIsLoading(true);
    try {
      const fetchedProjects = ProjectService.getProjects();
      setProjects(fetchedProjects);
    } catch (e: any) {
      console.error("ProjectContext: Error fetching projects", e);
      setError(e.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  }, [setError]); 

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const loadProject = useCallback((projectId: string) => {
    setIsLoading(true);
    let projectModified = false;
    try {
      let project = ProjectService.getProjectById(projectId);
      if (project) {
        // Ensure essential fields exist
        if (project.idea && (project.idea.targetChapterCount === undefined || project.idea.targetChapterCount === null || project.idea.targetChapterCount < 1)) {
          project.idea.targetChapterCount = TARGET_NOVEL_LENGTHS.find(tnl => tnl.id === project!.idea.targetNovelLength)?.defaultChapterCount || 20;
          projectModified = true;
        }
        if (project.initialAISetupPlan && !project.initialAISetupPlan.chapterOutlines) {
            project.initialAISetupPlan.chapterOutlines = [];
            projectModified = true;
        }
        if (project.initialAISetupPlan && !project.initialAISetupPlan.inProcessAmendments) {
            project.initialAISetupPlan.inProcessAmendments = "Novel Context Log Initiated. No specific developments logged yet.";
            projectModified = true;
        }
        if (!project.selectedGlobalAIModel) {
            project.selectedGlobalAIModel = DEFAULT_GEMINI_TEXT_MODEL;
            projectModified = true;
        }
        if (!project.systemLog) {
            project.systemLog = [{ timestamp: Date.now(), message: "Project loaded." }];
            projectModified = true;
        }
        if (project.lastTurnDurationMs === undefined) {
            project.lastTurnDurationMs = 0;
            projectModified = true;
        }
        project.chapters = project.chapters.map(ch => ({
          ...ch,
          autoRevisionRecommendedByAI: ch.autoRevisionRecommendedByAI || false,
          autoRevisionReasonsFromAI: ch.autoRevisionReasonsFromAI || undefined
        }));
        if (projectModified) {
            ProjectService.saveProject(project); 
        }
      }
      setActiveProject(project || null);
      setAutoRevisionsAttempted({}); 
      if (!project) {
        setError('Project not found');
        setIsAutoModeActive(false); 
        setAutoModeStatusMessage(null);
      } else {
        setIsAutoModeActive(false);
        setAutoModeStatusMessage(null);
      }
    } catch (e: any) {
      console.error("ProjectContext: Error loading project", e);
      setError(e.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [setError, setActiveProject, setIsAutoModeActive, setAutoModeStatusMessage, setAutoRevisionsAttempted, setIsLoading]);

  const createNewProjectCtx = async (title: string, idea: NovelIdea, selectedGlobalAIModel: string, sourceFiles: File[]): Promise<NovelProject | null> => {
    setIsLoading(true);
    setError(null);

    const readFiles = async (files: File[]): Promise<SourceDataFile[]> => {
      const filePromises = files.map(file => {
          return new Promise<SourceDataFile>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = e => {
                  if (e.target?.result) {
                      resolve({
                          id: crypto.randomUUID(),
                          name: file.name,
                          type: file.type,
                          content: e.target.result as string,
                      });
                  } else {
                      reject(new Error(`Failed to read file ${file.name}`));
                  }
              };
              reader.onerror = () => reject(new Error(`Error reading file ${file.name}`));
              reader.readAsText(file);
          });
      });
      return Promise.all(filePromises);
    };

    try {
      const sourceData = await readFiles(sourceFiles);
      const projectIdeaWithNumericWordCount: NovelIdea = {
        ...idea,
        targetChapterWordCount: Number(idea.targetChapterWordCount) || 8000,
        targetChapterCount: Number(idea.targetChapterCount) || TARGET_NOVEL_LENGTHS[1].defaultChapterCount,
      };
      const newProject = ProjectService.createNewProject(title, projectIdeaWithNumericWordCount, selectedGlobalAIModel, sourceData);
      newProject.initialAISetupPlan = {
        chapterOutlines: [],
        inProcessAmendments: `Novel Context Log Initiated. Stated Literary Influences: ${idea.literaryInfluences || 'None specified'}. Initial setup pending.`,
        conceptAndPremise: '', 
        charactersAndSetting: '',
        overallPlotOutline: '',
      };
      newProject.lastTurnDurationMs = 0;
      newProject.systemLog = [{ timestamp: Date.now(), message: `Project "${title}" created.` }];
      setProjects(prev => [...prev, newProject]);
      setActiveProject(newProject);
      setAutoRevisionsAttempted({}); 
      setIsAutoModeActive(false); 
      setAutoModeStatusMessage(null);
      return newProject;
    } catch (e: any) { 
      console.error("ProjectContext: Error creating project", e);
      setError(e.message || 'Failed to create project');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteProjectContext = (projectId: string) => {
    setIsLoading(true);
    try {
      ProjectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (activeProject?.id === projectId) {
        setActiveProject(null);
        setIsAutoModeActive(false); 
        setAutoModeStatusMessage(null);
        setAutoRevisionsAttempted({});
      }
    } catch (e:any) {
       console.error("ProjectContext: Error deleting project", e);
       setError(e.message || 'Failed to delete project');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProjectDataInternal = useCallback(async (updatedData: Partial<NovelProject>, save: boolean = true) => {
    if (!activeProject && !updatedData.id) { 
         console.warn("UpdateProjectDataInternal called without active project or full project data.");
         return;
    }
    
    const projectToUpdate = updatedData.id ? updatedData as NovelProject : activeProject!;
    const newActiveProjectState = { 
        ...projectToUpdate, 
        ...updatedData, 
        updatedAt: new Date().toISOString(),
        selectedGlobalAIModel: (updatedData.selectedGlobalAIModel || projectToUpdate.selectedGlobalAIModel || DEFAULT_GEMINI_TEXT_MODEL) 
    } as NovelProject;
    
    setActiveProject(newActiveProjectState); 
    
    if (save) {
        ProjectService.saveProject(newActiveProjectState);
        setProjects(prevProjects => prevProjects.map(p => p.id === newActiveProjectState.id ? newActiveProjectState : p));
    }
  }, [activeProject, setActiveProject, setProjects]);


  const updateProjectData = async (updatedData: Partial<NovelProject>) => {
    if (!activeProject) {
      setError("No active project to update.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      addLogEntry(`Manually updating project data.`);
      await updateProjectDataInternal(updatedData, true);
    } catch (e: any) {
      console.error("ProjectContext: Error updating project data", e);
      setError(e.message || 'Failed to update project data.');
      if (isAutoModeActive && !isAutoModePaused) {
        setIsAutoModePaused(true);
        setAutoModeStatusMessage(`Auto Mode Error during project update: ${e.message || 'Unknown error'}. Paused.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateInitialPlan = useCallback(async (rewriteContext?: string) => {
    if (!activeProject) {
      setError("No active project for initial planning.");
      throw new Error("No active project for initial planning.");
    }
    setIsLoading(true);
    setIsAITaskRunning(true);
    setCurrentAITaskMessage(rewriteContext ? 'Rewriting initial novel plan...' : 'Generating initial novel plan...');
    setError(null);
    addLogEntry(rewriteContext ? 'Rewriting initial novel plan with new context...' : "Generating initial novel plan...");
    const startTime = Date.now();
    try {
      const globalContextLogString = getGlobalContextAsString(activeProject.id);
      const planOutput = await GeminiService.generateInitialNovelPlan(activeProject.idea, activeProject.selectedGlobalAIModel, globalContextLogString, activeProject.sourceData, rewriteContext);
      const endTime = Date.now();
      
      if (planOutput.trim().length === 0) {
          throw new Error("AI failed to generate any content for the initial plan. Please try again or adjust your idea.");
      }

      const { novelTitle, synopsis: extractedSynopsis, logLine: extractedLogLine } = GeminiService.extractNovelTitleAndSynopsis(planOutput);
      const parsedPhaseData = GeminiService.parseInitialPlanOutput(planOutput);

      const timeLog: TimeLog = { startTime, endTime, durationMs: endTime - startTime };
      addLogEntry(`Initial plan generated in ${formatDurationShort(timeLog.durationMs)}.`);

      const initialAiSetup: InitialAISetupPlan = {
        conceptAndPremise: parsedPhaseData.conceptAndPremise || '', 
        charactersAndSetting: parsedPhaseData.charactersAndSetting || '',
        overallPlotOutline: parsedPhaseData.overallPlotOutline || '',
        logLine: extractedLogLine || parsedPhaseData.logLine, // Prioritize top-level, then phase-internal
        synopsis: extractedSynopsis || parsedPhaseData.synopsis, // Prioritize top-level, then phase-internal
        chapterOutlines: parsedPhaseData.chapterOutlines || [],
        inProcessAmendments: parsedPhaseData.inProcessAmendments || `Novel Context Log Initiated. Stated Literary Influences: ${activeProject.idea.literaryInfluences || 'None specified'}. Overall plot and character foundations established.`,
        timing: timeLog,
      };
      
      // Fallback if key components are still missing despite AI output
      if (!initialAiSetup.overallPlotOutline && planOutput.trim().length > 0) {
          console.warn("generateInitialPlan: overallPlotOutline was empty after parsing despite AI output. Using full planOutput as fallback to prevent loops.");
          initialAiSetup.overallPlotOutline = planOutput.trim();
          // If overallPlotOutline became the full output, re-try logline/synopsis from it if they were missed
          if (!initialAiSetup.logLine) initialAiSetup.logLine = GeminiService.extractNovelTitleAndSynopsis(initialAiSetup.overallPlotOutline).logLine;
          if (!initialAiSetup.synopsis) initialAiSetup.synopsis = GeminiService.extractNovelTitleAndSynopsis(initialAiSetup.overallPlotOutline).synopsis;
      }
      if (!initialAiSetup.conceptAndPremise && initialAiSetup.overallPlotOutline === planOutput.trim()) {
        // If overallPlotOutline is the full text, and concept is empty, use the full text for concept as well
        initialAiSetup.conceptAndPremise = planOutput.trim();
      }
      
      const updatedProjectFields : Partial<NovelProject> = {
        title: novelTitle || activeProject.title,
        initialAISetupPlan: initialAiSetup,
        lastTurnDurationMs: timeLog.durationMs,
        chapters: initialAiSetup.chapterOutlines?.map(co => ({ 
            chapterNumber: co.chapterNumber,
            title: co.workingTitle,
            plan: '',
            prose: '',
            review: '',
            autoRevisionRecommendedByAI: false,
        })) || activeProject.chapters 
      };
      await updateProjectDataInternal(updatedProjectFields);

      // Log elements to global context
      const newLogEntries: Omit<GlobalContextLogEntry, 'id'>[] = [];
      const characterSettingText = initialAiSetup.charactersAndSetting || "";
      const finalProjectName = novelTitle || activeProject.title;

      // Parse Protagonist
      const protagonistRegex = /Protagonist:\s*\{\s*name:\s*"(.*?)",\s*archetype:\s*"(.*?)",\s*goal:\s*"(.*?)"\s*\}/im;
      const protagMatch = characterSettingText.match(protagonistRegex);
      if (protagMatch) {
        newLogEntries.push({
          projectId: activeProject.id, projectName: finalProjectName, type: 'characterName',
          element: protagMatch[1], role: 'Protagonist', archetype: protagMatch[2]
        });
      }
      
      // Parse Antagonist
      const antagonistRegex = /Antagonist:\s*\{\s*name:\s*"(.*?)",\s*archetype:\s*"(.*?)".*?\}/im;
      const antagMatch = characterSettingText.match(antagonistRegex);
      if (antagMatch) {
          newLogEntries.push({
            projectId: activeProject.id, projectName: finalProjectName, type: 'characterName',
            element: antagMatch[1], role: 'Antagonist', archetype: antagMatch[2]
          });
      }

      // Parse Supporting Characters
      const supportingCharRegex = /SupportingCharacter:\s*\{\s*name:\s*"(.*?)",\s*role:\s*"(.*?)"\s*\}/gim;
      let supportMatch;
      while ((supportMatch = supportingCharRegex.exec(characterSettingText)) !== null) {
          newLogEntries.push({
            projectId: activeProject.id, projectName: finalProjectName, type: 'characterName',
            element: supportMatch[1], role: 'Supporting'
          });
      }
      
      // Log core theme
      if (activeProject.idea.coreThemes) {
        activeProject.idea.coreThemes.split(',').forEach(theme => {
            if (theme.trim()) {
                newLogEntries.push({
                    projectId: activeProject.id, projectName: finalProjectName,
                    type: 'coreConcept', element: theme.trim()
                });
            }
        });
      }

      if (newLogEntries.length > 0) {
        logGlobalElements(newLogEntries);
      }

    } catch (e: any) {
      console.error("ProjectContext: Critical error in generateInitialPlan core logic", e);
      addLogEntry(`ERROR: Initial plan generation failed: ${e.message}`);
      setError(e.message || 'Critical failure during initial plan generation.');
      if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error: ${e.message}. Paused.`);}
      throw e; // Re-throw to ensure it's caught by Auto Mode's top-level try-catch
    } finally {
      setIsLoading(false);
      setIsAITaskRunning(false);
      setCurrentAITaskMessage(null);
    }
  }, [activeProject, updateProjectDataInternal, getGlobalContextAsString, logGlobalElements, isAutoModeActive, isAutoModePaused, setError, setIsLoading, setIsAutoModePaused, setAutoModeStatusMessage, addLogEntry]); 
  
  const generateChapterPlan = useCallback(async (chapterNumber: number, planRevisionFeedback?: string) => {
    if (!activeProject || !activeProject.initialAISetupPlan || !activeProject.idea) {
      setError("Active project, initial plan, or project idea is missing.");
      if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error: Missing project data for planning. Paused.`);}
      throw new Error("Active project, initial plan, or project idea is missing for chapter plan generation.");
    }
    setIsLoading(true);
    setIsAITaskRunning(true);
    setCurrentAITaskMessage(planRevisionFeedback ? `Re-planning Chapter ${chapterNumber}...` : `Planning Chapter ${chapterNumber}...`);
    setError(null);
    addLogEntry(`Generating plan for Chapter ${chapterNumber}...`);
    const startTime = Date.now();
    try {
      try { 
        const previousChapterReview = chapterNumber > 1
          ? activeProject.chapters.find(c => c.chapterNumber === chapterNumber - 1)?.review
          : undefined;
        const currentChapterOutline = activeProject.initialAISetupPlan.chapterOutlines?.find(co => co.chapterNumber === chapterNumber);
        const currentChapterOutlineSynopsis = currentChapterOutline?.briefSynopsis || "Refer to overall plot.";
        const currentInProcessAmendments = activeProject.initialAISetupPlan.inProcessAmendments || "No context logged yet.";
        const literaryInfluences = activeProject.idea.literaryInfluences;

        const planOutputText = await GeminiService.generateChapterPlan(
          activeProject.title,
          chapterNumber,
          activeProject.initialAISetupPlan.overallPlotOutline || '',
          currentChapterOutlineSynopsis,
          currentInProcessAmendments,
          activeProject.idea.targetChapterWordCount,
          activeProject.selectedGlobalAIModel,
          literaryInfluences,
          previousChapterReview,
          planRevisionFeedback,
          activeProject.sourceData
        );
        const endTime = Date.now();
        const timeLog: TimeLog = { startTime, endTime, durationMs: endTime - startTime };
        addLogEntry(`Plan for Chapter ${chapterNumber} generated in ${formatDurationShort(timeLog.durationMs)}.`);
        
        const parsedPlanData = GeminiService.parseChapterPlanOutput(planOutputText);

        const chapterUpdates: Partial<ChapterContent> = { 
          plan: parsedPlanData.planText,
          title: parsedPlanData.workingTitle || currentChapterOutline?.workingTitle || `Chapter ${chapterNumber} Plan`, 
          prose: '', 
          review: '', 
          isRevised: !!planRevisionFeedback, 
          planUserFeedback: planRevisionFeedback || undefined,
          autoRevisionRecommendedByAI: false,
          autoRevisionReasonsFromAI: undefined,
          planTiming: timeLog,
          modelUsed: activeProject.selectedGlobalAIModel,
        };
        
        const projectWithUpdate = JSON.parse(JSON.stringify(activeProject)) as NovelProject;
        projectWithUpdate.lastTurnDurationMs = timeLog.durationMs;
        const existingChapterIndex = projectWithUpdate.chapters.findIndex(c => c.chapterNumber === chapterNumber);
        if (existingChapterIndex > -1) {
            projectWithUpdate.chapters[existingChapterIndex] = { ...projectWithUpdate.chapters[existingChapterIndex], ...chapterUpdates};
        } else {
            projectWithUpdate.chapters.push({ chapterNumber, ...chapterUpdates, plan: chapterUpdates.plan! ,prose: '', review: '', autoRevisionRecommendedByAI: false });
            projectWithUpdate.chapters.sort((a,b) => a.chapterNumber - b.chapterNumber);
        }
        
        if (parsedPlanData.planContextNotes && projectWithUpdate.initialAISetupPlan) {
            projectWithUpdate.initialAISetupPlan.inProcessAmendments = (projectWithUpdate.initialAISetupPlan.inProcessAmendments || "") + 
                `\n\n--- Chapter ${chapterNumber} Plan - Key Developments ---\n${parsedPlanData.planContextNotes}`;
        }
        
        if (parsedPlanData.workingTitle && projectWithUpdate.initialAISetupPlan?.chapterOutlines) {
          const outlineIndex = projectWithUpdate.initialAISetupPlan.chapterOutlines.findIndex(co => co.chapterNumber === chapterNumber);
          if (outlineIndex > -1) {
              projectWithUpdate.initialAISetupPlan.chapterOutlines[outlineIndex].workingTitle = parsedPlanData.workingTitle;
          }
        }
        await updateProjectDataInternal(projectWithUpdate);
      } catch (innerError: any) {
        console.error(`ProjectContext: Critical error in generateChapterPlan for Ch ${chapterNumber}`, innerError);
        addLogEntry(`ERROR: Plan generation for Chapter ${chapterNumber} failed: ${innerError.message}`);
        setError(innerError.message || `Critical failure during plan generation for Chapter ${chapterNumber}.`);
        if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error planning Ch ${chapterNumber}: ${innerError.message}. Paused.`);}
        throw innerError;
      }
    } catch (e: any) {
      if (!error) setError(e.message || `Failed to generate plan for Chapter ${chapterNumber}.`);
      if (isAutoModeActive && !isAutoModePaused && !autoModeStatusMessage?.includes("Error:")) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error planning Ch ${chapterNumber}: ${e.message}. Paused.`);}
    } finally {
      setIsLoading(false);
      setIsAITaskRunning(false);
      setCurrentAITaskMessage(null);
    }
  }, [activeProject, updateProjectDataInternal, isAutoModeActive, isAutoModePaused, error, autoModeStatusMessage, setError, setIsLoading, setIsAutoModePaused, setAutoModeStatusMessage, addLogEntry]);

  const generateChapterProse = useCallback(async (chapterNumber: number, proseRevisionFeedback?: string) => {
    if (!activeProject || !activeProject.idea) {
       setError("No active project or project idea.");
       if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error: Missing project data for prose. Paused.`);}
       throw new Error("No active project or project idea for prose generation.");
    }
    const chapter = activeProject.chapters.find(c => c.chapterNumber === chapterNumber);
    if (!chapter || !chapter.plan) {
      setError(`Plan for Chapter ${chapterNumber} is missing.`);
      if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error: Missing plan for Ch ${chapterNumber}. Paused.`);}
      throw new Error(`Plan for Chapter ${chapterNumber} is missing for prose generation.`);
    }
    setIsLoading(true);
    setIsAITaskRunning(true);
    setCurrentAITaskMessage(proseRevisionFeedback ? `Rewriting prose for Chapter ${chapterNumber}...` : `Writing prose for Chapter ${chapterNumber}...`);
    setError(null);
    addLogEntry(`Generating prose for Chapter ${chapterNumber}...`);
    const startTime = Date.now();
    try {
      try { 
        const proseOutput = await GeminiService.generateChapterProse(
          activeProject.title,
          chapterNumber,
          chapter.plan, 
          activeProject.idea.targetChapterWordCount,
          activeProject.selectedGlobalAIModel,
          proseRevisionFeedback
        );
        const endTime = Date.now();
        const timeLog: TimeLog = { startTime, endTime, durationMs: endTime - startTime };
        addLogEntry(`Prose for Chapter ${chapterNumber} generated in ${formatDurationShort(timeLog.durationMs)}.`);
        const { title: parsedTitle, prose: parsedProse } = GeminiService.parseChapterProseOutput(proseOutput);
        
        const chapterUpdates: Partial<ChapterContent> = { 
            prose: parsedProse, 
            title: parsedTitle || chapter.title || `Chapter ${chapterNumber}`, 
            review: '', 
            proseUserFeedback: proseRevisionFeedback,
            autoRevisionRecommendedByAI: false, 
            autoRevisionReasonsFromAI: undefined,
            proseTiming: timeLog,
          };

        const projectWithUpdate = JSON.parse(JSON.stringify(activeProject)) as NovelProject;
        projectWithUpdate.lastTurnDurationMs = timeLog.durationMs;
        const chapterIndex = projectWithUpdate.chapters.findIndex(c => c.chapterNumber === chapterNumber);
        if (chapterIndex > -1) {
            projectWithUpdate.chapters[chapterIndex] = { ...projectWithUpdate.chapters[chapterIndex], ...chapterUpdates };
            await updateProjectDataInternal(projectWithUpdate);
        } else {
              throw new Error('Failed to find chapter to update with prose.');
        }
      } catch (innerError: any) {
        console.error(`ProjectContext: Critical error in generateChapterProse for Ch ${chapterNumber}`, innerError);
        addLogEntry(`ERROR: Prose generation for Chapter ${chapterNumber} failed: ${innerError.message}`);
        setError(innerError.message || `Critical failure during prose generation for Chapter ${chapterNumber}.`);
        if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error writing Ch ${chapterNumber}: ${innerError.message}. Paused.`);}
        throw innerError;
      }
    } catch (e: any) {
      if (!error) setError(e.message || `Failed to generate prose for Chapter ${chapterNumber}.`);
      if (isAutoModeActive && !isAutoModePaused && !autoModeStatusMessage?.includes("Error:")) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error writing Ch ${chapterNumber}: ${e.message}. Paused.`);}
    } finally {
      setIsLoading(false);
      setIsAITaskRunning(false);
      setCurrentAITaskMessage(null);
    }
  }, [activeProject, updateProjectDataInternal, isAutoModeActive, isAutoModePaused, error, autoModeStatusMessage, setError, setIsLoading, setIsAutoModePaused, setAutoModeStatusMessage, addLogEntry]);
  
  const generateChapterReview = useCallback(async (chapterNumber: number, reviewRevisionFeedback?: string): Promise<GeminiService.ParsedChapterReview | null> => {
     if (!activeProject || !activeProject.idea || !activeProject.idea.targetChapterCount) {
       setError("No active project, project idea, or target chapter count defined.");
       if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error: Missing project data for review. Paused.`);}
       throw new Error("No active project, project idea, or target chapter count for review generation.");
    }
    const chapter = activeProject.chapters.find(c => c.chapterNumber === chapterNumber);
    if (!chapter || !chapter.prose || !chapter.plan) {
      setError(`Prose or plan for Chapter ${chapterNumber} is missing.`);
      if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error: Missing prose/plan for Ch ${chapterNumber}. Paused.`);}
      throw new Error(`Prose or plan for Chapter ${chapterNumber} is missing for review generation.`);
    }
    setIsLoading(true);
    setIsAITaskRunning(true);
    setCurrentAITaskMessage(reviewRevisionFeedback ? `Rewriting AI review for Chapter ${chapterNumber}...` : `Generating AI review for Chapter ${chapterNumber}...`);
    setError(null);
    addLogEntry(`Generating AI review for Chapter ${chapterNumber}...`);
    const startTime = Date.now();
    try {
      try { 
        const isFinalChapter = chapterNumber === activeProject.idea.targetChapterCount;
        const literaryInfluences = activeProject.idea.literaryInfluences;
        const reviewOutputText = await GeminiService.generateChapterReview(
          activeProject.title,
          chapterNumber,
          chapter.prose,
          chapter.plan,
          activeProject.idea.targetChapterWordCount,
          isFinalChapter,
          activeProject.selectedGlobalAIModel,
          literaryInfluences,
          activeProject.sourceData,
          reviewRevisionFeedback
        );
        const endTime = Date.now();
        const timeLog: TimeLog = { startTime, endTime, durationMs: endTime - startTime };
        addLogEntry(`Review for Chapter ${chapterNumber} generated in ${formatDurationShort(timeLog.durationMs)}.`);
        const parsedReviewData = GeminiService.parseChapterReviewOutput(reviewOutputText);
        
        const chapterUpdates: Partial<ChapterContent> = { 
            review: parsedReviewData.reviewText,
            reviewUserFeedback: reviewRevisionFeedback,
            autoRevisionRecommendedByAI: parsedReviewData.autoRevisionRecommended,
            autoRevisionReasonsFromAI: parsedReviewData.autoRevisionReasons,
            reviewTiming: timeLog,
        };
        if (parsedReviewData.suggestedTitle) {
          chapterUpdates.title = parsedReviewData.suggestedTitle;
          addLogEntry(`AI suggested new title for Chapter ${chapterNumber}: "${parsedReviewData.suggestedTitle}".`);
        }
        
        const projectWithUpdate = JSON.parse(JSON.stringify(activeProject)) as NovelProject;
        projectWithUpdate.lastTurnDurationMs = timeLog.durationMs;
        const chapterIndex = projectWithUpdate.chapters.findIndex(c => c.chapterNumber === chapterNumber);
        if (chapterIndex > -1) {
            projectWithUpdate.chapters[chapterIndex] = { ...projectWithUpdate.chapters[chapterIndex], ...chapterUpdates };
            projectWithUpdate.chapters[chapterIndex].autoRevisionRecommendedByAI = parsedReviewData.autoRevisionRecommended; 
            projectWithUpdate.chapters[chapterIndex].autoRevisionReasonsFromAI = parsedReviewData.autoRevisionReasons; 
            
            if (parsedReviewData.reviewContextNotes && projectWithUpdate.initialAISetupPlan) {
              projectWithUpdate.initialAISetupPlan.inProcessAmendments = (projectWithUpdate.initialAISetupPlan.inProcessAmendments || "") + 
                  `\n\n--- Chapter ${chapterNumber} Review - Key Developments & Insights from Prose ---\n${parsedReviewData.reviewContextNotes}`;
            }
            
            if (parsedReviewData.suggestedTitle && projectWithUpdate.initialAISetupPlan?.chapterOutlines) {
              const outlineIndex = projectWithUpdate.initialAISetupPlan.chapterOutlines.findIndex(co => co.chapterNumber === chapterNumber);
              if (outlineIndex > -1) {
                  projectWithUpdate.initialAISetupPlan.chapterOutlines[outlineIndex].workingTitle = parsedReviewData.suggestedTitle;
              }
            }
            await updateProjectDataInternal(projectWithUpdate);
            return parsedReviewData;
        } else {
              throw new Error('Failed to find chapter to update with review.');
        }
      } catch (innerError: any) {
        console.error(`ProjectContext: Critical error in generateChapterReview for Ch ${chapterNumber}`, innerError);
        addLogEntry(`ERROR: Review generation for Chapter ${chapterNumber} failed: ${innerError.message}`);
        setError(innerError.message || `Critical failure during review for Chapter ${chapterNumber}.`);
        if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error reviewing Ch ${chapterNumber}: ${innerError.message}. Paused.`);}
        throw innerError;
      }
    } catch (e: any) {
      if (!error) setError(e.message || `Failed to generate review for Chapter ${chapterNumber}.`);
      if (isAutoModeActive && !isAutoModePaused && !autoModeStatusMessage?.includes("Error:")) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error reviewing Ch ${chapterNumber}: ${e.message}. Paused.`);}
      return null; 
    } finally {
      setIsLoading(false);
      setIsAITaskRunning(false);
      setCurrentAITaskMessage(null);
    }
  }, [activeProject, updateProjectDataInternal, isAutoModeActive, isAutoModePaused, error, autoModeStatusMessage, setError, setIsLoading, setIsAutoModePaused, setAutoModeStatusMessage, addLogEntry]);

  const reviseChapter = useCallback(async (chapterNumber: number, feedbackForRevision: string) => {
    if (!activeProject || !activeProject.idea || !activeProject.initialAISetupPlan) {
       setError("No active project, project idea, or initial plan for chapter revision.");
        if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error: Missing project data for revision. Paused.`);}
       throw new Error("No active project, project idea, or initial plan for chapter revision.");
    }
    const chapterToRevise = activeProject.chapters.find(c => c.chapterNumber === chapterNumber);
    if (!chapterToRevise) {
      setError(`Chapter ${chapterNumber} not found for revision.`);
      if (isAutoModeActive && !isAutoModePaused) { setIsAutoModePaused(true); setAutoModeStatusMessage(`Error: Ch ${chapterNumber} not found for revision. Paused.`);}
      throw new Error(`Chapter ${chapterNumber} not found for revision.`);
    }

    setIsLoading(true);
    setIsAITaskRunning(true);
    setError(null);
    addLogEntry(`Starting revision for Chapter ${chapterNumber} with feedback...`);
    const startTime = Date.now();
    try {
      try { 
        const previousChapterReviewForPlanContext = chapterNumber > 1 
          ? activeProject.chapters.find(c => c.chapterNumber === chapterNumber - 1)?.review 
          : undefined;
        const currentChapterOutline = activeProject.initialAISetupPlan.chapterOutlines?.find(co => co.chapterNumber === chapterNumber);
        const currentChapterOutlineSynopsis = currentChapterOutline?.briefSynopsis || "Refer to overall plot.";
        const currentInProcessAmendments = activeProject.initialAISetupPlan.inProcessAmendments || "No context logged yet.";
        const literaryInfluences = activeProject.idea.literaryInfluences;
        
        setCurrentAITaskMessage(`Revising plan for Chapter ${chapterNumber}...`);
        addLogEntry(`Revising plan for Chapter ${chapterNumber}...`);


        const newPlanOutputText = await GeminiService.generateChapterPlan(
          activeProject.title,
          chapterNumber,
          activeProject.initialAISetupPlan.overallPlotOutline || '',
          currentChapterOutlineSynopsis,
          currentInProcessAmendments,
          activeProject.idea.targetChapterWordCount,
          activeProject.selectedGlobalAIModel,
          literaryInfluences,
          previousChapterReviewForPlanContext,
          feedbackForRevision,
          activeProject.sourceData
        );
        const parsedNewPlanData = GeminiService.parseChapterPlanOutput(newPlanOutputText);

        setCurrentAITaskMessage(`Revising prose for Chapter ${chapterNumber}...`);
        addLogEntry(`Revising prose for Chapter ${chapterNumber}...`);

        const newProseOutput = await GeminiService.generateChapterProse(
          activeProject.title,
          chapterNumber,
          parsedNewPlanData.planText, 
          activeProject.idea.targetChapterWordCount,
          activeProject.selectedGlobalAIModel
        );
        const endTime = Date.now();
        const timeLog: TimeLog = { startTime, endTime, durationMs: endTime - startTime };
        addLogEntry(`Chapter ${chapterNumber} fully revised in ${formatDurationShort(timeLog.durationMs)}.`);

        const { title: newChapterTitle, prose: parsedNewProse } = GeminiService.parseChapterProseOutput(newProseOutput);

        const chapterUpdates: Partial<ChapterContent> = {
          plan: parsedNewPlanData.planText,
          prose: parsedNewProse,
          title: newChapterTitle || parsedNewPlanData.workingTitle || chapterToRevise.title,
          userFeedbackForRevision: feedbackForRevision,
          planUserFeedback: feedbackForRevision, 
          isRevised: true,
          review: '', 
          autoRevisionRecommendedByAI: false, 
          autoRevisionReasonsFromAI: undefined,
          revisionTimings: [...(chapterToRevise.revisionTimings || []), timeLog],
          modelUsed: activeProject.selectedGlobalAIModel,
        };
        
        const projectWithUpdate = JSON.parse(JSON.stringify(activeProject)) as NovelProject;
        projectWithUpdate.lastTurnDurationMs = timeLog.durationMs;
        const chapterIndex = projectWithUpdate.chapters.findIndex(c => c.chapterNumber === chapterNumber);
        if (chapterIndex > -1) {
            projectWithUpdate.chapters[chapterIndex] = { ...projectWithUpdate.chapters[chapterIndex], ...chapterUpdates };
            
            if (parsedNewPlanData.planContextNotes && projectWithUpdate.initialAISetupPlan) {
                projectWithUpdate.initialAISetupPlan.inProcessAmendments = (projectWithUpdate.initialAISetupPlan.inProcessAmendments || "") + 
                    `\n\n--- Chapter ${chapterNumber} Re-Plan - Key Developments ---\n${parsedNewPlanData.planContextNotes}`;
            }
            if (parsedNewPlanData.workingTitle && projectWithUpdate.initialAISetupPlan?.chapterOutlines) {
              const outlineIndex = projectWithUpdate.initialAISetupPlan.chapterOutlines.findIndex(co => co.chapterNumber === chapterNumber);
              if (outlineIndex > -1) {
                  projectWithUpdate.initialAISetupPlan.chapterOutlines[outlineIndex].workingTitle = parsedNewPlanData.workingTitle;
              }
            }
            
            if (!isAutoModeActive || (isAutoModeActive && isAutoModePaused)) {
                setAutoRevisionsAttempted(prev => ({ ...prev, [chapterNumber]: 0 }));
            }
            await updateProjectDataInternal(projectWithUpdate, true);
        } else {
            throw new Error('Failed to find chapter to update with revised content.');
        }
      } catch (innerError: any) {
        console.error(`ProjectContext: Critical error in reviseChapter for Ch ${chapterNumber}`, innerError);
        addLogEntry(`ERROR: Revision for Chapter ${chapterNumber} failed: ${innerError.message}`);
        setError(innerError.message || `Critical failure during revision for Chapter ${chapterNumber}.`);
        if (isAutoModeActive && !isAutoModePaused) { 
            setIsAutoModePaused(true); 
            setAutoModeStatusMessage(`Auto Mode Error during revision of Ch ${chapterNumber}: ${innerError.message || 'Unknown error'}. Paused.`);
        }
        throw innerError;
      }
    } catch (e: any) {
      if (!error) setError(e.message || `Failed to revise Chapter ${chapterNumber}.`);
      if (isAutoModeActive && !isAutoModePaused && !autoModeStatusMessage?.includes("Error:")) { 
          setIsAutoModePaused(true); 
          setAutoModeStatusMessage(`Auto Mode Error during revision of Ch ${chapterNumber}: ${e.message || 'Unknown error'}. Paused.`);
      }
    } finally {
      setIsLoading(false);
      setIsAITaskRunning(false);
      setCurrentAITaskMessage(null);
    }
  }, [activeProject, updateProjectDataInternal, isAutoModeActive, isAutoModePaused, setAutoRevisionsAttempted, error, autoModeStatusMessage, setError, setIsLoading, setIsAutoModePaused, setAutoModeStatusMessage, addLogEntry]);

  const updateChapterTitle = async (chapterNumber: number, newTitle: string) => {
    if (!activeProject) {
      setError("No active project to update chapter title.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      addLogEntry(`Updating title for Chapter ${chapterNumber} to "${newTitle}".`);
      const projectWithUpdate = JSON.parse(JSON.stringify(activeProject)) as NovelProject;
      const chapterIndex = projectWithUpdate.chapters.findIndex(c => c.chapterNumber === chapterNumber);
      if (chapterIndex > -1) {
        projectWithUpdate.chapters[chapterIndex].title = newTitle;
      } else { 
        projectWithUpdate.chapters.push({ chapterNumber, title: newTitle, plan: '', prose: '', review: '', autoRevisionRecommendedByAI: false });
        projectWithUpdate.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
      }

      
      if (projectWithUpdate.initialAISetupPlan?.chapterOutlines) {
        const outlineIndex = projectWithUpdate.initialAISetupPlan.chapterOutlines.findIndex(co => co.chapterNumber === chapterNumber);
        if (outlineIndex > -1) {
          projectWithUpdate.initialAISetupPlan.chapterOutlines[outlineIndex].workingTitle = newTitle;
        } else { 
            projectWithUpdate.initialAISetupPlan.chapterOutlines.push({
                chapterNumber,
                workingTitle: newTitle,
                briefSynopsis: "Synopsis not yet generated.",
                keyContinuityPoints: []
            });
            projectWithUpdate.initialAISetupPlan.chapterOutlines.sort((a,b) => a.chapterNumber - b.chapterNumber);
        }
      }
      await updateProjectDataInternal(projectWithUpdate);
    } catch (e: any) {
      console.error("ProjectContext: Error updating chapter title", e);
      setError(e.message || `Failed to update title for Chapter ${chapterNumber}.`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSelectedGlobalAIModel = async (modelName: string) => {
    if (!activeProject) {
      setError("No active project to update AI model.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
        addLogEntry(`Updating AI model to ${modelName}.`);
        await updateProjectDataInternal({ selectedGlobalAIModel: modelName });
    } catch (e: any) {
        console.error("ProjectContext: Error updating AI model", e);
        setError(e.message || `Failed to update AI model to ${modelName}.`);
    } finally {
        setIsLoading(false);
    }
  };


  const setActiveProjectExplicitly = useCallback((project: NovelProject | null) => {
    let projectModified = false;
    if (project) {
        if (project.idea && (project.idea.targetChapterCount === undefined || project.idea.targetChapterCount === null || project.idea.targetChapterCount < 1)) {
            project.idea.targetChapterCount = TARGET_NOVEL_LENGTHS.find(tnl => tnl.id === project.idea.targetNovelLength)?.defaultChapterCount || 20;
            projectModified = true;
        }
        if (!project.initialAISetupPlan) {
            project.initialAISetupPlan = {
                chapterOutlines: [],
                inProcessAmendments: "Novel Context Log Initiated. No specific developments logged yet.",
                conceptAndPremise: '',
                charactersAndSetting: '',
                overallPlotOutline: '',
            };
            projectModified = true;
        } else {
            if (!project.initialAISetupPlan.chapterOutlines) {
                project.initialAISetupPlan.chapterOutlines = [];
                projectModified = true;
            }
            if (!project.initialAISetupPlan.inProcessAmendments) {
                project.initialAISetupPlan.inProcessAmendments = "Novel Context Log Initiated. No specific developments logged yet.";
                projectModified = true;
            }
        }
        if (!project.selectedGlobalAIModel) {
            project.selectedGlobalAIModel = DEFAULT_GEMINI_TEXT_MODEL;
            projectModified = true;
        }
        if (!project.systemLog) {
            project.systemLog = [];
            projectModified = true;
        }
        if (project.lastTurnDurationMs === undefined) {
            project.lastTurnDurationMs = 0;
            projectModified = true;
        }
        project.chapters = project.chapters.map(ch => ({
          ...ch,
          autoRevisionRecommendedByAI: ch.autoRevisionRecommendedByAI || false,
          autoRevisionReasonsFromAI: ch.autoRevisionReasonsFromAI || undefined
        }));

        if (projectModified) {
            ProjectService.saveProject(project); 
        }
    }
    setActiveProject(project);
    setIsAutoModeActive(false); 
    setAutoModeStatusMessage(null);
    setAutoRevisionsAttempted({});
  }, [ setActiveProject, setIsAutoModeActive, setAutoModeStatusMessage, setAutoRevisionsAttempted ]); 

  const fetchIdeaSparkSuggestions = async (initialIdeaText: string, modelForSpark: string, sourceFiles: File[], currentUserGenre?: string, currentUserSubGenre?: string) => {
    if (!initialIdeaText.trim() && sourceFiles.length === 0) {
      setError("Initial idea or source files must be provided to get suggestions.");
      return;
    }
    const modelToUse = modelForSpark || activeProject?.selectedGlobalAIModel || DEFAULT_GEMINI_TEXT_MODEL;

    setIsSuggestingModifiers(true);
    setError(null);
    setIdeaSparkSuggestions(null);

    const readFilesAsString = async (files: File[]): Promise<string> => {
        const fileContentPromises = files.map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target?.result as string);
                reader.onerror = () => reject(new Error(`Error reading file ${file.name}`));
                reader.readAsText(file);
            });
        });
        const contents = await Promise.all(fileContentPromises);
        return contents.map((content, i) => `--- File: ${files[i].name} ---\n${content.substring(0, 4000)}`).join('\n\n');
    };

    try {
      const sourceDataContent = sourceFiles.length > 0 ? await readFilesAsString(sourceFiles) : undefined;
      const suggestions = await GeminiService.suggestNovelModifiers(initialIdeaText, modelToUse, currentUserGenre, currentUserSubGenre, sourceDataContent);
      setIdeaSparkSuggestions(suggestions);
    } catch (e: any) {
      console.error("ProjectContext: Error fetching Idea Spark suggestions", e);
      setError(e.message || 'Failed to fetch Idea Spark suggestions.');
      setIdeaSparkSuggestions(null);
    } finally {
      setIsSuggestingModifiers(false);
    }
  };

  const clearIdeaSparkSuggestions = useCallback(() => {
    setIdeaSparkSuggestions(null);
  }, [setIdeaSparkSuggestions]); 

  const importProject = async (projectData: NovelProject): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!projectData.id || !projectData.title || !projectData.idea || !Array.isArray(projectData.chapters)) {
        throw new Error("Invalid project file format. Missing essential fields.");
      }
      const defaultIdeaSettings = TARGET_NOVEL_LENGTHS[1]; 
      projectData.idea = {
        targetChapterWordCount: defaultIdeaSettings.defaultChapterWords,
        targetChapterCount: defaultIdeaSettings.defaultChapterCount, 
        ...projectData.idea, 
        targetNovelLength: projectData.idea.targetNovelLength || defaultIdeaSettings.id,
        pointOfView: projectData.idea.pointOfView || POVS[1],
        pointOfViewTense: projectData.idea.pointOfViewTense || POINT_OF_VIEW_TENSES[0],
        proseComplexity: projectData.idea.proseComplexity || PROSE_COMPLEXITY_OPTIONS[1],
        pacing: projectData.idea.pacing || PACING_OPTIONS[1],
        characterCount: projectData.idea.characterCount || CHARACTER_COUNTS[1],
      };
      projectData.idea.targetChapterWordCount = Number(projectData.idea.targetChapterWordCount);
      projectData.idea.targetChapterCount = Number(projectData.idea.targetChapterCount || defaultIdeaSettings.defaultChapterCount);
      if (projectData.idea.targetChapterCount < 1) projectData.idea.targetChapterCount = defaultIdeaSettings.defaultChapterCount;

      projectData.currentChapterProcessing = projectData.currentChapterProcessing || 1;
      projectData.selectedGlobalAIModel = projectData.selectedGlobalAIModel || DEFAULT_GEMINI_TEXT_MODEL;
      projectData.lastTurnDurationMs = projectData.lastTurnDurationMs || 0;
      
       if (!projectData.initialAISetupPlan) {
            projectData.initialAISetupPlan = {
                chapterOutlines: [],
                inProcessAmendments: "Novel Context Log Imported. Original log not present or initialized.",
                conceptAndPremise: '',
                charactersAndSetting: '',
                overallPlotOutline: '',
            };
        } else {
            if (!projectData.initialAISetupPlan.chapterOutlines) projectData.initialAISetupPlan.chapterOutlines = [];
            if (!projectData.initialAISetupPlan.inProcessAmendments) projectData.initialAISetupPlan.inProcessAmendments = "Novel Context Log Imported. Original log not present or initialized.";
        }
      projectData.chapters = projectData.chapters.map(ch => ({
        ...ch,
        autoRevisionRecommendedByAI: ch.autoRevisionRecommendedByAI || false,
        autoRevisionReasonsFromAI: ch.autoRevisionReasonsFromAI || undefined
      }));

      projectData.systemLog = [...(projectData.systemLog || []), { timestamp: Date.now(), message: "Project imported successfully." }];

      ProjectService.saveProject(projectData);
      fetchProjects(); 
      setActiveProjectExplicitly(projectData); 
      return true;
    } catch (e: any) {
      console.error("ProjectContext: Error importing project", e);
      setError(e.message || 'Failed to import project.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoMode = () => {
    if (!activeProject) {
        setAutoModeStatusMessage("Cannot start Auto Mode: No active project loaded.");
        setIsAutoModeActive(false);
        return;
    }
     if (!activeProject.idea.targetChapterCount || activeProject.idea.targetChapterCount < 1) {
        setAutoModeStatusMessage("Cannot start Auto Mode: Target chapter count is not properly set.");
        setIsAutoModeActive(false);
        return;
    }
    setError(null); 
    const turningOn = !isAutoModeActive;
    setIsAutoModeActive(turningOn);
    setIsAutoModePaused(false); 
    if (turningOn) {
        setAutoModeStatusMessage("Auto Mode activated. Starting process...");
        addLogEntry("Auto Mode enabled.");
        setAutoRevisionsAttempted({}); 
    } else { 
        setAutoModeStatusMessage("Auto Mode deactivated by user.");
        addLogEntry("Auto Mode disabled.");
    }
  };

  const pauseAutoMode = () => {
    if (!isAutoModeActive) return;
    setIsAutoModePaused(true);
    setAutoModeStatusMessage("Pause requested. Auto Mode will halt after the current operation completes.");
    addLogEntry("Auto Mode pause requested.");
  };

  const resumeAutoMode = () => {
    if (!isAutoModeActive || !activeProject) {
        setAutoModeStatusMessage("Cannot resume Auto Mode: No active project or Auto Mode not active.");
        return;
    }
     if (!activeProject.idea.targetChapterCount || activeProject.idea.targetChapterCount < 1) {
        setAutoModeStatusMessage("Cannot resume Auto Mode: Target chapter count is invalid. Pausing.");
        setIsAutoModePaused(true);
        return;
    }
    setError(null);
    setIsAutoModePaused(false);
    setAutoModeStatusMessage("Auto Mode resumed.");
    addLogEntry("Auto Mode resumed.");
  };
  
  const executeNextAutoStep = useCallback(async () => {
    if (!activeProject || isLoading || isAutoModePaused || !isAutoModeActive) {
      if (isAutoModePaused && isAutoModeActive && !isLoading) {
        if (autoModeStatusMessage !== "Pause requested. Auto Mode will halt after the current operation completes." && autoModeStatusMessage !== "Auto Mode is paused.") {
            setAutoModeStatusMessage("Auto Mode is paused.");
        }
      }
      return;
    }

    const targetChapterCount = activeProject.idea.targetChapterCount || 0;
    if (targetChapterCount < 1) {
        setError("Target chapter count is invalid. Auto Mode cannot proceed.");
        setAutoModeStatusMessage("Error: Invalid target chapter count. Auto Mode paused.");
        addLogEntry("ERROR: Auto Mode paused due to invalid target chapter count.");
        setIsAutoModePaused(true);
        return;
    }

    try {
        const { initialAISetupPlan, chapters, currentChapterProcessing } = activeProject;
        
        if (!initialAISetupPlan || !initialAISetupPlan.overallPlotOutline) { 
            setAutoModeStatusMessage(`Auto: Generating initial novel plan...`);
            await generateInitialPlan();
            return; 
        }

        if (currentChapterProcessing > targetChapterCount) {
            setAutoModeStatusMessage("Auto: Novel reached target chapter count. Process complete.");
            addLogEntry("Auto Mode: Novel Complete.");
            setIsAutoModeActive(false);
            return;
        }
        
        const currentChapterData = chapters.find(c => c.chapterNumber === currentChapterProcessing);

        if (!currentChapterData || !currentChapterData.plan || (currentChapterData.isRevised && !currentChapterData.prose)) {
            const feedbackForReplan = currentChapterData?.isRevised ? currentChapterData.userFeedbackForRevision || currentChapterData.planUserFeedback : undefined;
            setAutoModeStatusMessage(`Auto: Planning Chapter ${currentChapterProcessing}${feedbackForReplan ? ' (with revision feedback)' : ''}...`);
            await generateChapterPlan(currentChapterProcessing, feedbackForReplan);
            return; 
        }
        
        if (!currentChapterData.prose) { 
            setAutoModeStatusMessage(`Auto: Writing prose for Chapter ${currentChapterProcessing}...`);
            await generateChapterProse(currentChapterProcessing);
            return; 
        }
        
        if (!currentChapterData.review) {
            setAutoModeStatusMessage(`Auto: Reviewing Chapter ${currentChapterProcessing}${currentChapterData.isRevised ? ' (Revised)' : ''}...`);
            await generateChapterReview(currentChapterProcessing); 
            return; 
        }
        
        // Re-fetch activeProject state to ensure chapterAfterReview has the latest review data (including autoRevisionRecommendedByAI)
        const reFetchedProjectForPostReview = ProjectService.getProjectById(activeProject.id);
        if (!reFetchedProjectForPostReview) throw new Error("Failed to reload project state after review for Auto Mode decision.");
        const chapterAfterReview = reFetchedProjectForPostReview.chapters.find(c => c.chapterNumber === currentChapterProcessing);

        if (chapterAfterReview?.review && chapterAfterReview?.autoRevisionRecommendedByAI) {
            if ((autoRevisionsAttempted[currentChapterProcessing] || 0) < MAX_AUTO_REVISIONS_PER_CHAPTER) {
                const attempts = (autoRevisionsAttempted[currentChapterProcessing] || 0) + 1;
                setAutoRevisionsAttempted(prev => ({ ...prev, [currentChapterProcessing]: attempts }));
                setAutoModeStatusMessage(`Auto: AI recommends revision for Chapter ${currentChapterProcessing}. Attempting AI-driven revision (${attempts}/${MAX_AUTO_REVISIONS_PER_CHAPTER})...`);
                
                const feedbackForAIRevision = chapterAfterReview.autoRevisionReasonsFromAI 
                    ? `AI Recommended Revisions based on its review:\n${chapterAfterReview.autoRevisionReasonsFromAI}` 
                    : "AI recommended revision. Please address feedback from review.";

                await reviseChapter(currentChapterProcessing, feedbackForAIRevision); 
                return; 
            } else { 
                setAutoModeStatusMessage(`Auto: Max automated revisions for Chapter ${currentChapterProcessing} reached. AI still recommends changes. Pausing Auto Mode for manual review.`);
                addLogEntry(`Auto Mode paused: Max revisions reached for Chapter ${currentChapterProcessing}.`);
                setIsAutoModePaused(true);
                return; 
            }
        }
        
        if (currentChapterProcessing < targetChapterCount) {
            setAutoModeStatusMessage(`Auto: Chapter ${currentChapterProcessing} processing complete. Proceeding to plan Chapter ${currentChapterProcessing + 1}...`);
            addLogEntry(`Auto Mode: Finished Chapter ${currentChapterProcessing}. Moving to Chapter ${currentChapterProcessing + 1}.`);
            await updateProjectDataInternal({ currentChapterProcessing: currentChapterProcessing + 1 });
            // Reset attempts for the *new* current chapter
            setAutoRevisionsAttempted(prev => ({ ...prev, [currentChapterProcessing + 1]: 0 })); 
            return; 
        } else { 
            setAutoModeStatusMessage("Auto: All chapters processed. Novel complete!");
            addLogEntry("Auto Mode: All chapters completed.");
            setIsAutoModeActive(false);
            return;
        }

    } catch (e: any) {
        console.error("ProjectContext: Error in executeNextAutoStep", e);
        setError(e.message || "An error occurred in Auto Mode.");
        setAutoModeStatusMessage(`Auto Mode Error: ${e.message || "An unknown error occurred."}. Auto Mode paused.`);
        addLogEntry(`ERROR: Auto Mode paused: ${e.message}`);
        setIsAutoModePaused(true); 
    }
  }, [
    activeProject, isLoading, isAutoModePaused, isAutoModeActive, autoRevisionsAttempted,
    generateInitialPlan, generateChapterPlan, generateChapterProse, generateChapterReview, 
    reviseChapter, updateProjectDataInternal, setError, setIsAutoModeActive, 
    setIsAutoModePaused, setAutoModeStatusMessage, setAutoRevisionsAttempted, addLogEntry
  ]); 

  // New Rewrite Functions
  const rewriteInitialPlan = useCallback(async (context: string) => {
    if (!activeProject) {
      setError("No active project to rewrite.");
      return;
    }
    await updateProjectDataInternal({ initialAISetupPlan: undefined, chapters: [], currentChapterProcessing: 1 }, true);
    await generateInitialPlan(context);
  }, [activeProject, updateProjectDataInternal, generateInitialPlan, setError]);

  const rewriteChapterPlan = useCallback(async (chapterNumber: number, context: string) => {
    if (!activeProject) return;
    const projectUpdate: Partial<NovelProject> = {
      chapters: activeProject.chapters.map(ch =>
        ch.chapterNumber === chapterNumber
          ? { ...ch, plan: '', prose: '', review: '', planUserFeedback: context, proseUserFeedback: undefined, reviewUserFeedback: undefined, isRevised: true, autoRevisionRecommendedByAI: false, autoRevisionReasonsFromAI: undefined }
          : ch
      )
    };
    await updateProjectDataInternal(projectUpdate, true);
    await generateChapterPlan(chapterNumber, context);
  }, [activeProject, updateProjectDataInternal, generateChapterPlan]);

  const rewriteChapterProse = useCallback(async (chapterNumber: number, context: string) => {
    if (!activeProject) return;
    const projectUpdate: Partial<NovelProject> = {
      chapters: activeProject.chapters.map(ch =>
        ch.chapterNumber === chapterNumber
          ? { ...ch, prose: '', review: '', proseUserFeedback: context, reviewUserFeedback: undefined, autoRevisionRecommendedByAI: false, autoRevisionReasonsFromAI: undefined }
          : ch
      )
    };
    await updateProjectDataInternal(projectUpdate, true);
    await generateChapterProse(chapterNumber, context);
  }, [activeProject, updateProjectDataInternal, generateChapterProse]);

  const rewriteChapterReview = useCallback(async (chapterNumber: number, context: string) => {
    if (!activeProject) return;
    const projectUpdate: Partial<NovelProject> = {
      chapters: activeProject.chapters.map(ch =>
        ch.chapterNumber === chapterNumber
          ? { ...ch, review: '', reviewUserFeedback: context, autoRevisionRecommendedByAI: false, autoRevisionReasonsFromAI: undefined }
          : ch
      )
    };
    await updateProjectDataInternal(projectUpdate, true);
    await generateChapterReview(chapterNumber, context);
  }, [activeProject, updateProjectDataInternal, generateChapterReview]);


  useEffect(() => {
    if (isAutoModeActive && !isAutoModePaused && !isLoading && activeProject) {
      const timer = setTimeout(() => {
         if (isAutoModeActive && !isAutoModePaused && !isLoading && activeProject) { 
            if (activeProject) {
                executeNextAutoStep();
            } else {
                console.warn("AutoMode: Active project became null before next step execution. Pausing.");
                setIsAutoModeActive(false); 
                setAutoModeStatusMessage("AutoMode: Active project lost. AutoMode disabled.");
            }
         }
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isAutoModeActive, isAutoModePaused, isLoading, activeProject, executeNextAutoStep]);

  return (
    <ProjectContext.Provider value={{
        projects, activeProject, isLoading, error, setError, 
        fetchProjects, loadProject, createNewProject: createNewProjectCtx,
        deleteProjectContext, updateProjectData, generateInitialPlan,
        generateChapterPlan, generateChapterProse, generateChapterReview,
        reviseChapter, updateChapterTitle, updateSelectedGlobalAIModel,
        rewriteInitialPlan, rewriteChapterPlan, rewriteChapterProse, rewriteChapterReview, // NEW
        clearError, setActiveProjectExplicitly,
        ideaSparkSuggestions, isSuggestingModifiers, fetchIdeaSparkSuggestions,
        clearIdeaSparkSuggestions, importProject, isAutoModeActive,
        isAutoModePaused, autoModeStatusMessage, toggleAutoMode,
        pauseAutoMode, resumeAutoMode, autoRevisionsAttempted,
        isAITaskRunning, timerSeconds, currentAITaskMessage
    }}>
      {children}
    </ProjectContext.Provider>
  );
};


export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};