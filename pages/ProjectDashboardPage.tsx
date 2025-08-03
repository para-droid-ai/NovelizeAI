

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import TextArea from '../components/TextArea';
import Modal from '../components/Modal';
import Input from '../components/Input'; // For title editing
import GlobalAISettingsModal from '../components/GlobalAISettingsModal'; 
import SystemLogModal from '../components/SystemLogModal';
import AITimingWidget from '../components/AITimingWidget';
import { ChapterContent, ProcessStage, ChapterOutline } from '../types';
import { countWords } from '../src/utils/textUtils';
import { formatDuration, formatDurationShort } from '../src/utils/timeUtils';
import { AVAILABLE_AI_MODELS } from '../constants';

interface RewriteButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  isLoading?: boolean;
}

const RewriteButton: React.FC<RewriteButtonProps> = ({ onClick, label, disabled, isLoading }) => (
  <Button 
    onClick={onClick} 
    variant="outline" 
    size="sm" 
    className="ml-3 text-xs border-yellow-500 text-yellow-400 hover:bg-yellow-700/30 hover:border-yellow-400"
    disabled={disabled || isLoading}
    isLoading={isLoading}
  >
    {label}
  </Button>
);

const SectionCard: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  badge?: string | React.ReactNode;
  contentClassName?: string;
  onEditTitle?: () => void; 
  showEditButton?: boolean;
  onRewrite?: () => void;
  rewriteLabel?: string;
  canRewrite?: boolean;
  isLoading?: boolean;
}> = 
    ({ title, children, defaultOpen = false, badge, contentClassName = "prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-sky-300 whitespace-pre-wrap", onEditTitle, showEditButton, onRewrite, rewriteLabel, canRewrite, isLoading }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionId = `section-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="bg-slate-800 rounded-lg shadow-lg mb-6">
      <div className="flex justify-between items-center p-4 hover:bg-slate-700/50 transition-colors rounded-t-lg">
        <button
          className="flex-grow flex items-center text-left text-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={sectionId}
        >
           <span className="font-semibold text-lg">{title}</span>
           {badge && (
            <div className="ml-3 flex items-center space-x-2">
                {badge}
            </div>
           )}
        </button>
        <div className="flex items-center">
            {showEditButton && onEditTitle && (
                <button onClick={onEditTitle} className="p-1 text-slate-400 hover:text-sky-300 mr-2" aria-label="Edit title" disabled={isLoading}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                    </svg>
                </button>
            )}
            {onRewrite && rewriteLabel && (
              <RewriteButton onClick={onRewrite} label={rewriteLabel} disabled={!canRewrite || isLoading} isLoading={isLoading} />
            )}
            <button
                className="p-1 text-slate-400 hover:text-sky-300 ml-2"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls={sectionId}
                aria-label={isOpen ? "Collapse section" : "Expand section"}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
        </div>
      </div>
      {isOpen && <div id={sectionId} className={`p-4 border-t border-slate-700 ${contentClassName}`}>{children}</div>}
    </div>
  );
};


const ProjectDashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    activeProject, loadProject, isLoading, error, setError, clearError,
    generateInitialPlan, generateChapterPlan, generateChapterProse,
    generateChapterReview, reviseChapter, updateChapterTitle, 
    updateProjectData,
    rewriteInitialPlan, rewriteChapterPlan, rewriteChapterProse, rewriteChapterReview,
    isAutoModeActive, isAutoModePaused, autoModeStatusMessage,
    toggleAutoMode, pauseAutoMode, resumeAutoMode,
    isAITaskRunning, currentAITaskMessage
  } = useProject();

  type RewriteType = 'initial-plan' | 'plan' | 'prose' | 'review';

  const [currentStage, setCurrentStage] = useState<ProcessStage>(ProcessStage.SETUP);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [chapterToRevise, setChapterToRevise] = useState<number | null>(null);

  const [isTitleEditModalOpen, setIsTitleEditModalOpen] = useState(false);
  const [chapterCurrentlyEditingTitle, setChapterCurrentlyEditingTitle] = useState<ChapterContent | ChapterOutline | null>(null);
  const [newTitleText, setNewTitleText] = useState('');
  const [isAISettingsModalOpen, setIsAISettingsModalOpen] = useState(false);
  const [isSystemLogModalOpen, setIsSystemLogModalOpen] = useState(false);

  const [isRewriteModalOpen, setIsRewriteModalOpen] = useState(false);
  const [rewriteContextText, setRewriteContextText] = useState('');
  const [rewriteConfig, setRewriteConfig] = useState<{ chapterNumber?: number; type: RewriteType } | null>(null);
  
  const [isLoglineSynopsisOpen, setIsLoglineSynopsisOpen] = useState(true);
  const [contextLogExpansion, setContextLogExpansion] = useState<'closed' | 'half' | 'full'>('closed');

  const handleContextLogToggle = () => {
    setContextLogExpansion(prev => {
        if (prev === 'closed') return 'half';
        if (prev === 'half') return 'full';
        return 'closed';
    });
  };

  const reversedContextLog = useMemo(() => {
    if (!activeProject?.initialAISetupPlan?.inProcessAmendments) return '';
    const log = activeProject.initialAISetupPlan.inProcessAmendments;
    
    const entries = log.split('\n\n--- ');
    if (entries.length <= 1) {
        return log;
    }
    
    const reversedEntries = entries.reverse();
    
    return reversedEntries.map((entry, index) => {
        if (index === reversedEntries.length - 1) {
            return entry;
        }
        return `--- ${entry}`;
    }).join('\n\n');
  }, [activeProject?.initialAISetupPlan?.inProcessAmendments]);


  useEffect(() => {
    if (projectId) {
      clearError(); 
      loadProject(projectId);
    } else {
      navigate('/');
    }
    return () => {
      // Cleanup logic can be handled by HomePage or other components if needed
    };
  }, [projectId, navigate, clearError, loadProject]);


  useEffect(() => {
    if (activeProject) {
      const { initialAISetupPlan, chapters, currentChapterProcessing, idea } = activeProject;
      const targetChapterCount = idea.targetChapterCount || 20; 

      if (!initialAISetupPlan || !initialAISetupPlan.overallPlotOutline) {
        setCurrentStage(ProcessStage.SETUP);
      } else if (currentChapterProcessing > targetChapterCount) {
        setCurrentStage(ProcessStage.COMPLETED);
      } else {
        const chapterData = chapters.find(c => c.chapterNumber === currentChapterProcessing);
        if (!chapterData || !chapterData.plan) {
          setCurrentStage(ProcessStage.CHAPTER_PLANNING);
        } else if (!chapterData.prose) {
          setCurrentStage(ProcessStage.CHAPTER_WRITING);
        } else if (!chapterData.review) {
          setCurrentStage(ProcessStage.CHAPTER_REVIEWING);
        } else {
           if (currentChapterProcessing < targetChapterCount) {
             setCurrentStage(ProcessStage.CHAPTER_PLANNING); 
           } else {
             setCurrentStage(ProcessStage.COMPLETED); 
           }
        }
      }
    } else {
      setCurrentStage(ProcessStage.SETUP); 
    }
  }, [activeProject]);

  const handleAction = async (action: () => Promise<any>) => {
    clearError();
    try {
      await action();
    } catch (e: any) {
      console.error("Dashboard action failed:", e.message);
      if (!error) { 
        setError(e.message || "An unknown error occurred during the action.");
      }
    }
  };

  const openRewriteModal = (type: RewriteType, chapterNumber?: number) => {
    setRewriteConfig({ type, chapterNumber });
    setRewriteContextText('');
    setIsRewriteModalOpen(true);
  };

  const handleRewriteSubmit = async () => {
    if (!rewriteConfig) return;
  
    const { type, chapterNumber } = rewriteConfig;
    const context = rewriteContextText.trim();
  
    if (context === "") {
      alert("Please provide some context or feedback for the rewrite.");
      return;
    }
  
    if (type === 'initial-plan') {
      await handleAction(() => rewriteInitialPlan(context));
    } else if (chapterNumber) {
      if (type === 'plan') await handleAction(() => rewriteChapterPlan(chapterNumber, context));
      if (type === 'prose') await handleAction(() => rewriteChapterProse(chapterNumber, context));
      if (type === 'review') await handleAction(() => rewriteChapterReview(chapterNumber, context));
    }
  
    setIsRewriteModalOpen(false);
    setRewriteConfig(null);
    setRewriteContextText('');
  };


  const openRevisionModal = (chapterNumber: number) => {
    setChapterToRevise(chapterNumber);
    const chapter = activeProject?.chapters.find(c => c.chapterNumber === chapterNumber);
    setRevisionFeedback(chapter?.userFeedbackForRevision || '');
    setIsRevisionModalOpen(true);
  };

  const handleRevisionSubmit = () => {
    if (chapterToRevise === null || !revisionFeedback.trim()) {
      alert("Feedback cannot be empty.");
      return;
    }
    handleAction(() => reviseChapter(chapterToRevise, revisionFeedback));
    setIsRevisionModalOpen(false);
    setRevisionFeedback('');
    setChapterToRevise(null);
  };

  const handleProceedToNext = () => {
    if (activeProject && activeProject.idea.targetChapterCount && activeProject.currentChapterProcessing < activeProject.idea.targetChapterCount) {
      handleAction(() => updateProjectData({ currentChapterProcessing: activeProject.currentChapterProcessing + 1 }));
    } else if (activeProject) {
      setCurrentStage(ProcessStage.COMPLETED); 
    }
  };

  const openTitleEditModal = (item: ChapterContent | ChapterOutline) => {
    setChapterCurrentlyEditingTitle(item);
    let currentTitleValue = '';
    if ('title' in item && item.title !== undefined) { 
      currentTitleValue = item.title;
    } else if ('workingTitle' in item && item.workingTitle !== undefined) { 
      currentTitleValue = item.workingTitle;
    }
    setNewTitleText(currentTitleValue);
    setIsTitleEditModalOpen(true);
  };

  const handleTitleEditSubmit = async () => {
    if (!chapterCurrentlyEditingTitle || !newTitleText.trim()) {
        setError("New title cannot be empty.");
        return;
    }
    clearError();
    await handleAction(() => updateChapterTitle(chapterCurrentlyEditingTitle.chapterNumber, newTitleText.trim()));
    setIsTitleEditModalOpen(false);
    setChapterCurrentlyEditingTitle(null);
    setNewTitleText('');
  };


  const exportNovelToTxt = () => {
    if (!activeProject) return;
    let content = `# ${activeProject.title}\n\n`;
    if (activeProject.initialAISetupPlan?.logLine) {
      content += `Logline: ${activeProject.initialAISetupPlan.logLine}\n\n`;
    }
    if (activeProject.initialAISetupPlan?.synopsis) {
      content += `Synopsis: ${activeProject.initialAISetupPlan.synopsis}\n\n`;
    }
    activeProject.chapters.forEach(chapter => {
      content += `## Chapter ${chapter.chapterNumber}${chapter.title ? `: ${chapter.title}` : ''}\n\n`;
      content += `${chapter.prose || "Prose not yet generated."}\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeProject.title.replace(/\s+/g, '_')}_novel.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  
  const exportProjectToJson = () => {
    if (!activeProject) return;
    try {
      const projectJson = JSON.stringify(activeProject, null, 2);
      const blob = new Blob([projectJson], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${activeProject.title.replace(/\s+/g, '_')}_project_state.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (e: any) {
      setError(`Failed to export project: ${e.message}`);
      console.error("Error exporting project to JSON:", e);
    }
  };


  if (!activeProject && !isLoading) { 
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center py-10">
        <h2 className="text-2xl font-semibold text-sky-300 mb-4">Project Not Found</h2>
        <p className="text-slate-400 mb-6">The requested project could not be loaded or does not exist.</p>
        <Button onClick={() => navigate('/')}>Go to My Projects</Button>
      </div>
    );
  }
  if (isLoading && !activeProject) { 
    return <div className="flex justify-center items-center h-full"><LoadingSpinner text="Loading project..." size="lg" /></div>;
  }
  if (!activeProject) return null; 

  const { initialAISetupPlan, chapters, currentChapterProcessing, idea, title, selectedGlobalAIModel } = activeProject;
  const currentChapterData = chapters.find(c => c.chapterNumber === currentChapterProcessing);
  const targetChapterCount = idea.targetChapterCount || 20;
  const isNovelComplete = currentChapterProcessing > targetChapterCount || (currentStage === ProcessStage.COMPLETED && currentChapterProcessing === targetChapterCount) ;

  const isAutoModeRunning = isAutoModeActive && !isAutoModePaused;
  const scrollableContentClass = "prose prose-sm prose-invert max-w-none whitespace-pre-wrap overflow-y-auto max-h-[40rem]";
  const baseContentClass = "prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-sky-300 whitespace-pre-wrap";

  const currentTotalNovelWords = chapters.reduce((sum, chapter) => {
    if (chapter.prose) {
      return sum + countWords(chapter.prose);
    }
    return sum;
  }, 0);
  const targetNovelWordCount = idea.targetChapterWordCount * targetChapterCount;
  const novelProgressPercentage = targetNovelWordCount > 0 ? Math.min(100, (currentTotalNovelWords / targetNovelWordCount) * 100) : 0;
  const currentModelLabel = AVAILABLE_AI_MODELS.find(m => m.value === selectedGlobalAIModel)?.label || selectedGlobalAIModel || "Default Model";

  const getRewriteModalTitle = (): string => {
    if (!rewriteConfig) return 'Rewrite';
    const { type, chapterNumber } = rewriteConfig;
    switch (type) {
      case 'initial-plan': return 'Rewrite Initial Novel Plan';
      case 'plan': return `Rewrite Plan for Chapter ${chapterNumber}`;
      case 'prose': return `Rewrite Prose for Chapter ${chapterNumber}`;
      case 'review': return `Rewrite Review for Chapter ${chapterNumber}`;
      default: return 'Rewrite Content';
    }
  };


  return (
    <div className="flex flex-col h-full animate-fade-in">
        {/* Static Project Header */}
        <div className="flex-shrink-0 bg-slate-900/80 backdrop-blur-md shadow-lg border-b border-slate-700/50 z-10">
            <div className="container mx-auto px-4 sm:px-6 py-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                        <h1 className="text-3xl font-bold text-sky-300 break-words">{title}</h1>
                        <p className="text-slate-400 mb-1">Genre: {idea.genre} {idea.subGenre && `(${idea.subGenre})`}</p>
                        <p className="text-slate-400 mb-1">Literary Influences: {idea.literaryInfluences || 'None specified'}</p>
                        <p className="text-slate-400 mb-1">
                            Target: ~{idea.targetChapterWordCount} words/chapter, {targetChapterCount} chapters.
                            Current Stage: <span className="font-semibold text-sky-400">{isNovelComplete ? ProcessStage.COMPLETED : currentStage}</span>
                            {isNovelComplete ? '' : ` (Chapter ${currentChapterProcessing} of ${targetChapterCount})`}
                        </p>
                        <p className="text-xs text-slate-500">Using AI Model: <span className="font-semibold text-slate-400">{currentModelLabel}</span></p>
                    </div>
                    <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                        <div className="flex space-x-2">
                            <Button
                                onClick={() => setIsSystemLogModalOpen(true)}
                                variant="outline"
                                size="sm"
                                className="p-2"
                                aria-label="Open System Log and Timings"
                                disabled={isLoading}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </Button>
                            <Button 
                                onClick={() => setIsAISettingsModalOpen(true)} 
                                variant="outline" 
                                size="sm" 
                                className="p-2"
                                aria-label="Open AI Model Settings"
                                disabled={isLoading || isAutoModeRunning}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-sky-400">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                              </svg>
                            </Button>
                        </div>
                        <AITimingWidget />
                    </div>
                </div>

                <div className="text-slate-400 mb-4">
                    <p>Overall Progress: {currentTotalNovelWords.toLocaleString()} / {targetNovelWordCount.toLocaleString()} words ({novelProgressPercentage.toFixed(0)}%)</p>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-1">
                        <div 
                            className="bg-sky-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${novelProgressPercentage > 100 ? 100 : novelProgressPercentage}%` }}
                            role="progressbar" aria-valuenow={novelProgressPercentage} aria-valuemin={0} aria-valuemax={100} aria-label="Novel writing progress"
                        ></div>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <h2 className="text-lg font-semibold text-sky-400 flex-shrink-0">Auto Mode</h2>
                            {isAITaskRunning && <LoadingSpinner size="sm" />}
                            {isAITaskRunning && currentAITaskMessage ? (
                                <p className="text-sm text-slate-300 italic truncate" title={currentAITaskMessage}>
                                    {currentAITaskMessage}
                                </p>
                            ) : autoModeStatusMessage ? (
                                <p className={`text-sm ${error && isAutoModeActive ? 'text-red-400' : 'text-slate-300'} italic truncate`} title={autoModeStatusMessage}>
                                    {autoModeStatusMessage}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                            {!isAutoModeActive && (
                                <Button onClick={toggleAutoMode} disabled={isAITaskRunning || isNovelComplete} variant="primary" aria-label="Enable Auto Mode" size="sm">
                                    Enable
                                </Button>
                            )}
                            {isAutoModeActive && !isAutoModePaused && (
                                <Button onClick={pauseAutoMode} variant="secondary" aria-label="Pause Auto Mode" size="sm">
                                    Pause
                                </Button>
                            )}
                            {isAutoModeActive && isAutoModePaused && (
                                <Button onClick={resumeAutoMode} disabled={isAITaskRunning} variant="primary" aria-label="Resume Auto Mode" size="sm">
                                    Resume
                                </Button>
                            )}
                            {isAutoModeActive && (
                                <Button onClick={toggleAutoMode} variant="danger" aria-label="Disable Auto Mode" size="sm">
                                    Disable
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Scrollable Main Content */}
        <div className="flex-grow overflow-y-auto">
            <div className="container mx-auto p-4 sm:p-6">
                {error && (
                    <div className="my-4 p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-sm">
                    <p className="font-semibold">Error:</p>
                    <p>{error}</p>
                    <Button onClick={clearError} variant="danger" size="sm" className="mt-2">Clear Error</Button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
                    <>
                        {(!initialAISetupPlan || !initialAISetupPlan.overallPlotOutline) && currentStage === ProcessStage.SETUP && (
                        <Button onClick={() => handleAction(() => generateInitialPlan())} isLoading={isAITaskRunning} disabled={isAITaskRunning || isAutoModeRunning} fullWidth>
                           {isAITaskRunning && (currentStage === ProcessStage.SETUP || currentStage === ProcessStage.INITIAL_PLANNING) ? (currentAITaskMessage || 'Generating...') : 'Generate Initial AI Plan'}
                        </Button>
                        )}
                        {initialAISetupPlan && initialAISetupPlan.overallPlotOutline && !isNovelComplete && currentStage === ProcessStage.CHAPTER_PLANNING && (!currentChapterData || !currentChapterData.plan) && (
                        <Button onClick={() => handleAction(() => generateChapterPlan(currentChapterProcessing))} isLoading={isAITaskRunning} disabled={isAITaskRunning || isAutoModeRunning} fullWidth>
                            {isAITaskRunning && currentStage === ProcessStage.CHAPTER_PLANNING ? (currentAITaskMessage || 'Planning...') : `Plan Chapter ${currentChapterProcessing}`}
                        </Button>
                        )}
                        {initialAISetupPlan && !isNovelComplete && currentStage === ProcessStage.CHAPTER_WRITING && currentChapterData?.plan && !currentChapterData.prose && (
                        <Button onClick={() => handleAction(() => generateChapterProse(currentChapterProcessing))} isLoading={isAITaskRunning} disabled={isAITaskRunning || isAutoModeRunning} fullWidth>
                            {isAITaskRunning && currentStage === ProcessStage.CHAPTER_WRITING ? (currentAITaskMessage || 'Writing...') : `Write Prose for Chapter ${currentChapterProcessing}`}
                        </Button>
                        )}
                        {initialAISetupPlan && !isNovelComplete && currentStage === ProcessStage.CHAPTER_REVIEWING && currentChapterData?.prose && !currentChapterData.review && (
                        <Button onClick={() => handleAction(() => generateChapterReview(currentChapterProcessing))} isLoading={isAITaskRunning} disabled={isAITaskRunning || isAutoModeRunning} fullWidth>
                            {isAITaskRunning && currentStage === ProcessStage.CHAPTER_REVIEWING ? (currentAITaskMessage || 'Reviewing...') : `Review Chapter ${currentChapterProcessing}`}
                        </Button>
                        )}
                        {initialAISetupPlan && !isNovelComplete && currentChapterData?.review && currentChapterProcessing < targetChapterCount && (currentStage === ProcessStage.CHAPTER_PLANNING || currentStage === ProcessStage.CHAPTER_REVIEWING) && ( 
                        <Button onClick={handleProceedToNext} variant="primary" disabled={isAITaskRunning || isAutoModeRunning} fullWidth>
                                Proceed to Plan Chapter {currentChapterProcessing + 1}
                            </Button>
                        )}
                        {initialAISetupPlan && isNovelComplete && (
                            <div className="lg:col-span-4 text-center p-4 bg-green-800/30 rounded-md text-green-300">
                                Novel generation complete for all {targetChapterCount} chapters! You can review chapters or export the novel.
                            </div>
                        )}
                    </>
                </div>
                
                {isLoading && !isAITaskRunning && <LoadingSpinner text="Processing your request..." className="my-8" />}

                {initialAISetupPlan && (initialAISetupPlan.overallPlotOutline || initialAISetupPlan.conceptAndPremise) && (
                    <SectionCard 
                    title="Overall Novel Plan (AI Generated)" 
                    defaultOpen={!chapters.length}
                    badge={initialAISetupPlan.timing && <span className="px-2 py-0.5 bg-slate-600 text-xs text-slate-200 rounded-full font-mono">{formatDurationShort(initialAISetupPlan.timing.durationMs)}</span>}
                    onRewrite={() => openRewriteModal('initial-plan')}
                    rewriteLabel="Rewrite Initial Plan"
                    canRewrite={!!initialAISetupPlan?.overallPlotOutline && !isAutoModeActive}
                    isLoading={isAITaskRunning}
                    >
                    <div className="bg-slate-800/50 rounded-lg mb-4">
                        <button
                            className="w-full flex justify-between items-center p-3 hover:bg-slate-700/50 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                            onClick={() => setIsLoglineSynopsisOpen(!isLoglineSynopsisOpen)}
                            aria-expanded={isLoglineSynopsisOpen}
                        >
                            <h4 className="font-semibold text-sky-300">Logline & Synopsis</h4>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-200 text-slate-400 ${isLoglineSynopsisOpen ? 'rotate-180' : ''}`}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {isLoglineSynopsisOpen && (
                            <div className="p-4 border-t border-slate-700 prose prose-invert max-w-none prose-p:text-slate-300">
                                <p className="mb-0"><strong>Logline:</strong> {initialAISetupPlan.logLine || "Not generated yet."}</p>
                                <p className="mt-2 mb-0"><strong>Synopsis:</strong> {initialAISetupPlan.synopsis || "Not generated yet."}</p>
                            </div>
                        )}
                    </div>
                    <SectionCard title="Full Initial AI Verbalization (Phases 1-3)" contentClassName={scrollableContentClass}>
                        <p><strong>Phase 1: Concept & Premise:</strong></p>
                        <pre className="whitespace-pre-wrap">{initialAISetupPlan.conceptAndPremise || "Not generated or content too short."}</pre>
                        <p className="mt-4"><strong>Phase 2: Characters & Setting:</strong></p>
                        <pre className="whitespace-pre-wrap">{initialAISetupPlan.charactersAndSetting || "Not generated or content too short."}</pre>
                        <p className="mt-4"><strong>Phase 3: Overall Plot Outline Details:</strong></p>
                        <pre className="whitespace-pre-wrap">{initialAISetupPlan.overallPlotOutline || "Not generated or content too short."}</pre>
                    </SectionCard>
                    {initialAISetupPlan.chapterOutlines && initialAISetupPlan.chapterOutlines.length > 0 && (
                        <SectionCard title="Chapter Outlines Overview" defaultOpen={false} contentClassName={scrollableContentClass}>
                            {initialAISetupPlan.chapterOutlines.map(co => (
                                <div key={co.chapterNumber} className="py-2 border-b border-slate-700 last:border-b-0">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-md font-semibold text-sky-200">Chapter {co.chapterNumber}: {co.workingTitle || "Untitled"}</h4>
                                        <button onClick={() => openTitleEditModal(co)} className="p-1 text-slate-400 hover:text-sky-300 text-xs" aria-label={`Edit title for chapter ${co.chapterNumber}`} disabled={isAITaskRunning || isAutoModeActive}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                                <path d="M4.343 12.243L5.232 9.414a2.5 2.5 0 0 1 .864-1.086l4.95-4.95a1.5 1.5 0 0 1 2.121 2.122l-4.95 4.95a2.5 2.5 0 0 1-1.086.864l-2.829.943a.375.375 0 0 1-.468-.468Z" />
                                                <path d="M2.5 4.25a.75.75 0 0 0-.75.75v7a.75.75 0 0 0 .75.75h7a.75.75 0 0 0 .75-.75V9a.75.75 0 0 1 1.5 0v3A2.25 2.25 0 0 1 9.5 14h-7A2.25 2.25 0 0 1 .25 11.75v-7A2.25 2.25 0 0 1 2.5 2.5H6a.75.75 0 0 1 0 1.5H2.5Z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-sm text-slate-300 italic ml-2">{co.briefSynopsis}</p>
                                    {co.keyContinuityPoints && co.keyContinuityPoints.length > 0 && (
                                        <ul className="list-disc list-inside ml-4 mt-1 text-xs text-slate-400">
                                            {co.keyContinuityPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </SectionCard>
                    )}
                    {initialAISetupPlan.inProcessAmendments && (
                         <div className="bg-slate-800 rounded-lg shadow-lg mb-6">
                            <button
                                className={`w-full flex justify-between items-center p-4 hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500 rounded-t-lg ${contextLogExpansion === 'closed' ? 'rounded-b-lg' : ''}`}
                                onClick={handleContextLogToggle}
                                aria-expanded={contextLogExpansion !== 'closed'}
                            >
                                <span className="font-semibold text-lg text-sky-400">Evolving Story Context / Notes Log</span>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 transition-transform duration-200 text-slate-400 ${contextLogExpansion !== 'closed' ? 'rotate-180' : ''}`}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                            <div className={`grid transition-all duration-300 ease-in-out ${contextLogExpansion !== 'closed' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="p-4 border-t border-slate-700">
                                        <div className={`prose prose-sm prose-invert max-w-none overflow-y-auto transition-all duration-300 ease-in-out custom-scrollbar ${contextLogExpansion === 'half' ? 'max-h-60' : 'max-h-[40rem]'}`}>
                                            <pre className="whitespace-pre-wrap !p-0 !bg-transparent">{reversedContextLog}</pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    </SectionCard>
                )}

                {!isNovelComplete && currentChapterData && (
                    <SectionCard 
                        title={`Chapter ${currentChapterProcessing}${currentChapterData.title ? `: ${currentChapterData.title}` : ''}`} 
                        defaultOpen={true}
                        badge={<>
                            {currentChapterData.isRevised && <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 text-xs rounded-full">Revised</span>}
                            {currentChapterData.planTiming && <span className="px-2 py-0.5 bg-slate-600 text-xs text-slate-200 rounded-full font-mono">Plan: {formatDurationShort(currentChapterData.planTiming.durationMs)}</span>}
                            {currentChapterData.proseTiming && <span className="px-2 py-0.5 bg-slate-600 text-xs text-slate-200 rounded-full font-mono">Prose: {formatDurationShort(currentChapterData.proseTiming.durationMs)}</span>}
                            {currentChapterData.reviewTiming && <span className="px-2 py-0.5 bg-slate-600 text-xs text-slate-200 rounded-full font-mono">Review: {formatDurationShort(currentChapterData.reviewTiming.durationMs)}</span>}
                        </>}
                        onEditTitle={() => openTitleEditModal(currentChapterData)}
                        showEditButton={true}
                    >
                    {currentChapterData.plan && (
                        <SectionCard 
                        title="Chapter Plan" 
                        defaultOpen={!currentChapterData.prose} 
                        contentClassName={scrollableContentClass}
                        onRewrite={() => openRewriteModal('plan', currentChapterData.chapterNumber)}
                        rewriteLabel="Rewrite Plan"
                        canRewrite={!!currentChapterData.plan && !isAutoModeActive}
                        isLoading={isAITaskRunning}
                        >
                        {currentChapterData.plan}
                        </SectionCard>
                    )}
                    {currentChapterData.prose && (
                        <SectionCard 
                        title={`Chapter Prose (Words: ${countWords(currentChapterData.prose)} / ${idea.targetChapterWordCount})`} 
                        defaultOpen={!currentChapterData.review} 
                        contentClassName={scrollableContentClass}
                        onRewrite={() => openRewriteModal('prose', currentChapterData.chapterNumber)}
                        rewriteLabel="Rewrite Prose"
                        canRewrite={!!currentChapterData.prose && !isAutoModeActive}
                        isLoading={isAITaskRunning}
                        >
                        {currentChapterData.title && <h3 className="text-lg font-semibold text-sky-200 mb-2">{currentChapterData.title}</h3>}
                        {currentChapterData.prose}
                        </SectionCard>
                    )}
                    {currentChapterData.review && (
                        <SectionCard 
                        title="Chapter Review (AI Generated)" 
                        defaultOpen={true} 
                        contentClassName={scrollableContentClass}
                        onRewrite={() => openRewriteModal('review', currentChapterData.chapterNumber)}
                        rewriteLabel="Rewrite Review"
                        canRewrite={!!currentChapterData.review && !isAutoModeActive}
                        isLoading={isAITaskRunning}
                        >
                        {currentChapterData.review}
                        </SectionCard>
                    )}
                    {currentChapterData.prose && ( 
                        <div className="mt-4">
                            <Button onClick={() => openRevisionModal(currentChapterProcessing)} variant="outline" disabled={isAITaskRunning || isAutoModeActive}>
                                Revise Chapter {currentChapterProcessing} Manually
                            </Button>
                        </div>
                        )}
                    </SectionCard>
                )}
                
                {chapters.filter(c => c.chapterNumber < currentChapterProcessing || isNovelComplete).length > 0 && (
                    <SectionCard title="Completed Chapters" defaultOpen={isNovelComplete}>
                    {chapters
                        .filter(c => c.chapterNumber < currentChapterProcessing || (isNovelComplete && c.chapterNumber <= targetChapterCount) )
                        .sort((a, b) => b.chapterNumber - a.chapterNumber) 
                        .map(chapter => (
                        <SectionCard 
                            key={chapter.chapterNumber} 
                            title={`Chapter ${chapter.chapterNumber}${chapter.title ? `: ${chapter.title}` : ''} (Words: ${countWords(chapter.prose)} / ${idea.targetChapterWordCount})`}
                            badge={<>
                                {chapter.isRevised && <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 text-xs rounded-full">Revised</span>}
                                {chapter.planTiming && <span className="px-2 py-0.5 bg-slate-600 text-xs text-slate-200 rounded-full font-mono">Plan: {formatDurationShort(chapter.planTiming.durationMs)}</span>}
                                {chapter.proseTiming && <span className="px-2 py-0.5 bg-slate-600 text-xs text-slate-200 rounded-full font-mono">Prose: {formatDurationShort(chapter.proseTiming.durationMs)}</span>}
                                {chapter.reviewTiming && <span className="px-2 py-0.5 bg-slate-600 text-xs text-slate-200 rounded-full font-mono">Review: {formatDurationShort(chapter.reviewTiming.durationMs)}</span>}
                            </>}
                            onEditTitle={() => openTitleEditModal(chapter)}
                            showEditButton={true}
                            isLoading={isAITaskRunning}
                        >
                            {chapter.plan && 
                            <SectionCard 
                                title="Plan" 
                                contentClassName={scrollableContentClass}
                                onRewrite={() => openRewriteModal('plan', chapter.chapterNumber)}
                                rewriteLabel="Rewrite Plan"
                                canRewrite={!!chapter.plan && !isAutoModeActive}
                                isLoading={isAITaskRunning}
                            >
                                {chapter.plan}
                            </SectionCard>}
                            {chapter.prose && 
                            <SectionCard 
                                title="Prose" 
                                contentClassName={scrollableContentClass}
                                onRewrite={() => openRewriteModal('prose', chapter.chapterNumber)}
                                rewriteLabel="Rewrite Prose"
                                canRewrite={!!chapter.prose && !isAutoModeActive}
                                isLoading={isAITaskRunning}
                            >
                                {chapter.prose}
                            </SectionCard>}
                            {chapter.review && 
                            <SectionCard 
                                title="Review" 
                                contentClassName={scrollableContentClass}
                                onRewrite={() => openRewriteModal('review', chapter.chapterNumber)}
                                rewriteLabel="Rewrite Review"
                                canRewrite={!!chapter.review && !isAutoModeActive}
                                isLoading={isAITaskRunning}
                            >
                                {chapter.review}
                            </SectionCard>}
                            {chapter.userFeedbackForRevision && <SectionCard title="Revision Feedback Provided" contentClassName={baseContentClass}>{chapter.userFeedbackForRevision}</SectionCard>}
                            <div className="mt-2">
                                <Button onClick={() => openRevisionModal(chapter.chapterNumber)} variant="outline" size="sm" disabled={isAITaskRunning || isAutoModeActive}>
                                    Revise This Chapter
                                </Button>
                            </div>
                        </SectionCard>
                        ))}
                    </SectionCard>
                )}
                
                {initialAISetupPlan && (
                    <div className="mt-8 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Button onClick={exportNovelToTxt} variant="secondary" size="lg" disabled={isAITaskRunning || isAutoModeActive}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Export Novel to .txt
                        </Button>
                        <Button onClick={exportProjectToJson} variant="outline" size="lg" disabled={isAITaskRunning || isAutoModeActive}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            Export Project to .json
                        </Button>
                    </div>
                )}
            </div>
        </div>

      <Modal isOpen={isRevisionModalOpen} onClose={() => setIsRevisionModalOpen(false)} title={`Revise Chapter ${chapterToRevise}`}>
        <TextArea
          label="Your Feedback for Revision:"
          value={revisionFeedback}
          onChange={(e) => setRevisionFeedback(e.target.value)}
          rows={6}
          placeholder="Provide specific points for the AI to address..."
        />
        <div className="mt-4 flex justify-end space-x-2">
          <Button variant="secondary" onClick={() => setIsRevisionModalOpen(false)}>Cancel</Button>
          <Button onClick={handleRevisionSubmit} isLoading={isLoading}>Submit Revision</Button>
        </div>
      </Modal>

      <Modal 
        isOpen={isTitleEditModalOpen} 
        onClose={() => setIsTitleEditModalOpen(false)} 
        title={`Edit Title for Chapter ${chapterCurrentlyEditingTitle?.chapterNumber}`}
      >
        <Input
          label="New Chapter Title"
          id="newChapterTitleInput"
          value={newTitleText}
          onChange={(e) => setNewTitleText(e.target.value)}
          placeholder="Enter the new title"
          autoFocus
        />
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="secondary" onClick={() => setIsTitleEditModalOpen(false)}>Cancel</Button>
          <Button onClick={handleTitleEditSubmit} isLoading={isLoading}>Save Title</Button>
        </div>
      </Modal>

      <GlobalAISettingsModal 
        isOpen={isAISettingsModalOpen}
        onClose={() => setIsAISettingsModalOpen(false)}
      />
      
      <SystemLogModal 
        isOpen={isSystemLogModalOpen} 
        onClose={() => setIsSystemLogModalOpen(false)} 
        project={activeProject} 
      />

      <Modal 
        isOpen={isRewriteModalOpen} 
        onClose={() => {
            setIsRewriteModalOpen(false); 
            setRewriteConfig(null); 
            setRewriteContextText('');
        }} 
        title={getRewriteModalTitle()}
        size="lg"
      >
        <TextArea
          label="Context for Rewrite"
          value={rewriteContextText}
          onChange={(e) => setRewriteContextText(e.target.value)}
          rows={8}
          placeholder="Provide new context, feedback, or direction. For example: 'Make the plan more suspenseful' or 'Rewrite the prose to be more cynical and gritty.'"
        />
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={() => setIsRewriteModalOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleRewriteSubmit} isLoading={isLoading}>Submit Rewrite</Button>
        </div>
      </Modal>

       <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .max-h-\\[40rem\\] { 
            max-height: 40rem;
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #475569; /* slate-600 */
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #334155; /* slate-700 */
        }
      `}</style>
    </div>
  );
};

export default ProjectDashboardPage;