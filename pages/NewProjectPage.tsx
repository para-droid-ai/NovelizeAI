

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { NovelIdea, IdeaSparkSuggestions } from '../types';
import Input from '../components/Input';
import TextArea from '../components/TextArea';
import Select from '../components/Select';
import Button from '../components/Button';
import IdeaSparkModal from '../components/IdeaSparkModal';
import { 
  GENRES, TARGET_NOVEL_LENGTHS, CHARACTER_COUNTS, EXAMPLE_TIME_PERIODS, 
  POVS, POINT_OF_VIEW_TENSES, NARRATIVE_TONE_EXAMPLES, PROSE_COMPLEXITY_OPTIONS, 
  PACING_OPTIONS, SETTING_ATMOSPHERE_EXAMPLES, SUB_GENRE_EXAMPLES, CUSTOM_OPTION_VALUE,
  TARGET_CHAPTER_COUNTS, AVAILABLE_AI_MODELS, DEFAULT_GEMINI_TEXT_MODEL
} from '../constants';

const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    createNewProject, 
    isLoading: isProjectLoading, 
    error: projectError, 
    clearError: clearProjectError,
    ideaSparkSuggestions,
    isSuggestingModifiers,
    fetchIdeaSparkSuggestions,
    clearIdeaSparkSuggestions
  } = useProject();
  
  const [title, setTitle] = useState('');
  const [selectedGlobalAIModel, setSelectedGlobalAIModel] = useState<string>(DEFAULT_GEMINI_TEXT_MODEL);
  const [isIdeaSparkModalOpen, setIsIdeaSparkModalOpen] = useState(false);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [idea, setIdea] = useState<NovelIdea>({
    initialIdea: '',
    genre: GENRES[0], 
    subGenre: SUB_GENRE_EXAMPLES[GENRES[0]]?.[0] || '',
    targetNovelLength: TARGET_NOVEL_LENGTHS[1].id, 
    targetChapterWordCount: TARGET_NOVEL_LENGTHS[1].defaultChapterWords,
    targetChapterCount: TARGET_NOVEL_LENGTHS[1].defaultChapterCount,
    pointOfView: POVS[1], 
    pointOfViewTense: POINT_OF_VIEW_TENSES[0], 
    narrativeTone: '', 
    proseComplexity: PROSE_COMPLEXITY_OPTIONS[1], 
    pacing: PACING_OPTIONS[1], 
    coreThemes: '', 
    settingEraLocation: '',
    settingAtmosphere: '', 
    characterCount: CHARACTER_COUNTS[1], 
    literaryInfluences: '', // NEW
  });

  // State for custom genre/sub-genre inputs
  const [selectedGenreOption, setSelectedGenreOption] = useState<string>(idea.genre);
  const [customGenreText, setCustomGenreText] = useState<string>('');
  const [selectedSubGenreOption, setSelectedSubGenreOption] = useState<string>(idea.subGenre || '');
  const [customSubGenreText, setCustomSubGenreText] = useState<string>('');


  useEffect(() => {
    const selectedNovelLengthDetails = TARGET_NOVEL_LENGTHS.find(cat => cat.id === idea.targetNovelLength);
    if (selectedNovelLengthDetails) {
      setIdea(prev => ({ 
        ...prev, 
        targetChapterWordCount: selectedNovelLengthDetails.defaultChapterWords,
        // Also update chapter count if it's not custom, to align with typical novel length
        targetChapterCount: prev.targetChapterCount && TARGET_CHAPTER_COUNTS.some(tc => tc.value === String(prev.targetChapterCount)) 
                             ? prev.targetChapterCount 
                             : selectedNovelLengthDetails.defaultChapterCount
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea.targetNovelLength]);

  useEffect(() => {
    return () => {
      clearIdeaSparkSuggestions();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    clearProjectError();

    if (name === 'title') {
      setTitle(value);
    } else if (name === 'selectedGlobalAIModel') {
      setSelectedGlobalAIModel(value);
    } else if (name === 'selectedGenreOption') {
      setSelectedGenreOption(value);
      if (value === CUSTOM_OPTION_VALUE) {
        setIdea(prev => ({ ...prev, genre: '', subGenre: '' }));
        setCustomGenreText('');
        setSelectedSubGenreOption(CUSTOM_OPTION_VALUE); // Force subgenre to custom if genre is custom
        setCustomSubGenreText('');
      } else {
        const defaultSubGenre = SUB_GENRE_EXAMPLES[value]?.[0] || '';
        setIdea(prev => ({ ...prev, genre: value, subGenre: defaultSubGenre }));
        setCustomGenreText('');
        setSelectedSubGenreOption(defaultSubGenre);
        setCustomSubGenreText('');
      }
    } else if (name === 'customGenreText') {
      setCustomGenreText(value);
      setIdea(prev => ({ ...prev, genre: value, subGenre: '' })); // Subgenre becomes custom text if main genre is custom
      setSelectedSubGenreOption(CUSTOM_OPTION_VALUE);
      setCustomSubGenreText('');
    } else if (name === 'selectedSubGenreOption') {
      setSelectedSubGenreOption(value);
      if (value === CUSTOM_OPTION_VALUE) {
        setIdea(prev => ({ ...prev, subGenre: '' }));
        setCustomSubGenreText('');
      } else {
        setIdea(prev => ({ ...prev, subGenre: value }));
        setCustomSubGenreText('');
      }
    } else if (name === 'customSubGenreText') {
      setCustomSubGenreText(value);
      setIdea(prev => ({ ...prev, subGenre: value }));
    } else if (name === 'targetChapterCount') {
        setIdea(prev => ({ ...prev, targetChapterCount: parseInt(value, 10) || undefined }));
    } else {
      setIdea(prev => ({ ...prev, [name]: name === 'targetChapterWordCount' ? parseInt(value, 10) || 0 : value }));
    }
  };
  
  const currentSubGenreOptions = selectedGenreOption !== CUSTOM_OPTION_VALUE && SUB_GENRE_EXAMPLES[selectedGenreOption]
    ? SUB_GENRE_EXAMPLES[selectedGenreOption].map(sg => ({ value: sg, label: sg }))
    : [];
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSourceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };
  const removeFile = (fileName: string) => {
      setSourceFiles(prev => prev.filter(f => f.name !== fileName));
  };
  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleSparkIdeasClick = async () => {
    if (idea.initialIdea.trim().length === 0 && sourceFiles.length === 0) {
      alert("Please provide an initial idea or upload some source files for better AI suggestions.");
      return;
    }
    clearProjectError();
    const currentGenreForSpark = selectedGenreOption === CUSTOM_OPTION_VALUE ? customGenreText : selectedGenreOption;
    const currentSubGenreForSpark = selectedSubGenreOption === CUSTOM_OPTION_VALUE ? customSubGenreText : selectedSubGenreOption;
    
    await fetchIdeaSparkSuggestions(idea.initialIdea, selectedGlobalAIModel, sourceFiles, currentGenreForSpark, currentSubGenreForSpark);
    setIsIdeaSparkModalOpen(true);
  };

  const handleApplyIdeaSparkSuggestions = (appliedSuggestions: IdeaSparkSuggestions) => {
    if (appliedSuggestions.suggestedProjectTitle) {
      setTitle(appliedSuggestions.suggestedProjectTitle);
    }

    const newIdeaState = { ...idea };

    if (appliedSuggestions.suggestedInitialIdeaRefinement) {
      newIdeaState.initialIdea = appliedSuggestions.suggestedInitialIdeaRefinement;
    }

    if (appliedSuggestions.genre) {
      const isStandardGenre = GENRES.includes(appliedSuggestions.genre);
      setSelectedGenreOption(isStandardGenre ? appliedSuggestions.genre : CUSTOM_OPTION_VALUE);
      if (isStandardGenre) {
        newIdeaState.genre = appliedSuggestions.genre;
        setCustomGenreText('');
      } else {
        newIdeaState.genre = appliedSuggestions.genre; // Keep AI's custom suggestion
        setCustomGenreText(appliedSuggestions.genre);
      }
    }

    if (appliedSuggestions.subGenre) {
        const currentMainGenre = appliedSuggestions.genre || newIdeaState.genre;
        const subGenresForCurrentMain = SUB_GENRE_EXAMPLES[currentMainGenre] || [];
        const isStandardSubGenre = subGenresForCurrentMain.includes(appliedSuggestions.subGenre);

        if (selectedGenreOption === CUSTOM_OPTION_VALUE || newIdeaState.genre === customGenreText) { // If main genre is custom
            setSelectedSubGenreOption(CUSTOM_OPTION_VALUE);
            setCustomSubGenreText(appliedSuggestions.subGenre);
            newIdeaState.subGenre = appliedSuggestions.subGenre;
        } else if (isStandardSubGenre) {
            setSelectedSubGenreOption(appliedSuggestions.subGenre);
            newIdeaState.subGenre = appliedSuggestions.subGenre;
            setCustomSubGenreText('');
        } else { // AI suggested a subgenre not in list for a standard main genre
            setSelectedSubGenreOption(CUSTOM_OPTION_VALUE);
            setCustomSubGenreText(appliedSuggestions.subGenre);
            newIdeaState.subGenre = appliedSuggestions.subGenre;
        }
    } else if (appliedSuggestions.genre) { // Genre changed, clear subgenre
        setSelectedSubGenreOption('');
        setCustomSubGenreText('');
        newIdeaState.subGenre = '';
    }


    if (appliedSuggestions.targetNovelLength) newIdeaState.targetNovelLength = appliedSuggestions.targetNovelLength;
    if (appliedSuggestions.targetChapterWordCount !== undefined) {
      newIdeaState.targetChapterWordCount = Number(appliedSuggestions.targetChapterWordCount);
    }
    if (appliedSuggestions.targetChapterCount !== undefined) {
      newIdeaState.targetChapterCount = Number(appliedSuggestions.targetChapterCount);
    }
    if (appliedSuggestions.pointOfView) newIdeaState.pointOfView = appliedSuggestions.pointOfView;
    if (appliedSuggestions.pointOfViewTense) newIdeaState.pointOfViewTense = appliedSuggestions.pointOfViewTense;
    if (appliedSuggestions.narrativeTone) newIdeaState.narrativeTone = appliedSuggestions.narrativeTone;
    if (appliedSuggestions.proseComplexity) newIdeaState.proseComplexity = appliedSuggestions.proseComplexity;
    if (appliedSuggestions.pacing) newIdeaState.pacing = appliedSuggestions.pacing;
    if (appliedSuggestions.coreThemes) newIdeaState.coreThemes = appliedSuggestions.coreThemes;
    if (appliedSuggestions.settingEraLocation) newIdeaState.settingEraLocation = appliedSuggestions.settingEraLocation;
    if (appliedSuggestions.settingAtmosphere) newIdeaState.settingAtmosphere = appliedSuggestions.settingAtmosphere;
    if (appliedSuggestions.characterCount) newIdeaState.characterCount = appliedSuggestions.characterCount;
    if (appliedSuggestions.literaryInfluences) newIdeaState.literaryInfluences = appliedSuggestions.literaryInfluences; // NEW
      
    setIdea(newIdeaState);
    setIsIdeaSparkModalOpen(false);
    clearIdeaSparkSuggestions();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearProjectError();

    const finalGenre = selectedGenreOption === CUSTOM_OPTION_VALUE ? customGenreText.trim() : selectedGenreOption;
    let finalSubGenre = selectedSubGenreOption === CUSTOM_OPTION_VALUE ? customSubGenreText.trim() : selectedSubGenreOption;
    
    // If main genre is custom, subgenre must also be custom text or empty
    if (selectedGenreOption === CUSTOM_OPTION_VALUE && selectedSubGenreOption !== CUSTOM_OPTION_VALUE) {
        finalSubGenre = customSubGenreText.trim(); // Ensure it takes custom text if main is custom
    }


    if (!title.trim() || !idea.initialIdea.trim() || !finalGenre) {
        alert("Please fill in at least the Project Title, Initial Idea, and Genre.");
        return;
    }
    if (selectedGenreOption === CUSTOM_OPTION_VALUE && !customGenreText.trim()){
        alert("If 'Type your own' is selected for Genre, please enter your custom genre.");
        return;
    }
    if (selectedSubGenreOption === CUSTOM_OPTION_VALUE && !customSubGenreText.trim() && selectedGenreOption !== CUSTOM_OPTION_VALUE){
        // Only enforce if main genre is standard. If main genre is custom, subgenre can be empty.
        alert("If 'Type your own' is selected for Sub-Genre, please enter your custom sub-genre.");
        return;
    }

    if (idea.targetChapterWordCount < 1000) {
        alert("Target chapter word count seems too low. Please set a realistic value (e.g., at least 1000 words).");
        return;
    }
    if (!idea.targetChapterCount || idea.targetChapterCount < 1) {
        alert("Please select a valid target chapter count.");
        return;
    }


    const projectIdeaToSubmit: NovelIdea = {
        ...idea,
        genre: finalGenre,
        subGenre: finalSubGenre || undefined, // Ensure empty string becomes undefined
        targetChapterWordCount: Number(idea.targetChapterWordCount),
        targetChapterCount: Number(idea.targetChapterCount),
        literaryInfluences: idea.literaryInfluences?.trim() || undefined, // NEW
    };

    const newProject = await createNewProject(title, projectIdeaToSubmit, selectedGlobalAIModel, sourceFiles);
    if (newProject) {
      navigate(`/project/${newProject.id}`);
    }
  };
  
  const genreOptions = GENRES.map(g => ({ value: g, label: g }));
  genreOptions.push({value: CUSTOM_OPTION_VALUE, label: "Type your own..."});

  const subGenreFinalOptions = 
    selectedGenreOption === CUSTOM_OPTION_VALUE || !selectedGenreOption // If main genre is custom or not selected
    ? [] 
    : SUB_GENRE_EXAMPLES[selectedGenreOption]?.map(sg => ({ value: sg, label: sg })) || [];
  
  if (selectedGenreOption !== CUSTOM_OPTION_VALUE && selectedGenreOption) { // Only add custom if a standard genre is selected
      subGenreFinalOptions.push({value: CUSTOM_OPTION_VALUE, label: "Type your own..."});
  }


  return (
    <div className="max-w-3xl mx-auto bg-slate-800 p-6 sm:p-8 rounded-xl shadow-2xl animate-slide-up">
      <h1 className="text-3xl font-bold text-sky-300 mb-8 text-center">Craft Your Novel's Blueprint</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Project Title / Working Title"
          id="title"
          name="title"
          value={title}
          onChange={handleInputChange}
          placeholder="e.g., The Last Starlight, Chronicle of the Shadow Wielder"
          required
        />
        <TextArea
          label="Your Initial Novel Idea / Concept (Optional if uploading files)"
          id="initialIdea"
          name="initialIdea"
          value={idea.initialIdea}
          onChange={handleInputChange}
          placeholder="Describe your core concept, a captivating 'what if' scenario, or a central conflict..."
          rows={5}
        />

        <div className="p-4 border border-dashed border-slate-600 rounded-lg bg-slate-800/50">
            <h3 className="text-lg font-semibold text-sky-400 mb-2">Source Data / Context (Optional)</h3>
            <p className="text-sm text-slate-400 mb-4">
                Upload .txt, .md, or .json files to provide context. The AI will use this data for idea generation, planning, and checking for consistency. E.g., game state data, a world-building document, or character biographies.
            </p>
            <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileChange}
                accept=".txt,.md,.json,text/plain,text/markdown,application/json"
                className="hidden"
                aria-hidden="true"
            />
            <Button type="button" variant="outline" onClick={triggerFileSelect}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Upload Files
            </Button>
            {sourceFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-300">Uploaded Files:</h4>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                    {sourceFiles.map((file, index) => (
                    <li key={index} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md text-sm">
                        <span className="truncate" title={file.name}>{file.name} ({Math.round(file.size / 1024)} KB)</span>
                        <button
                          type="button"
                          onClick={() => removeFile(file.name)}
                          className="text-red-500 hover:text-red-400 font-bold p-1 ml-2"
                          aria-label={`Remove ${file.name}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </li>
                    ))}
                </ul>
                </div>
            )}
        </div>
        
        <div className="my-4">
          <Button 
            type="button" 
            onClick={handleSparkIdeasClick} 
            variant="outline" 
            fullWidth 
            disabled={(idea.initialIdea.trim().length === 0 && sourceFiles.length === 0) || isSuggestingModifiers || isProjectLoading}
            isLoading={isSuggestingModifiers}
          >
            {isSuggestingModifiers ? 'AI is Thinking...' : 'Spark Ideas with AI ✨ (Suggest Modifiers)'}
          </Button>
          {(idea.initialIdea.trim().length === 0 && sourceFiles.length === 0) && (
            <p className="text-xs text-slate-400 mt-1 text-center">Enter an initial idea or upload source files to enable AI suggestions.</p>
          )}
        </div>

        <h2 className="text-xl font-semibold text-sky-400 pt-2 border-t border-slate-700">AI & Structural Modifiers</h2>
        <Select
          label="Global AI Model for this Project"
          id="selectedGlobalAIModel"
          name="selectedGlobalAIModel"
          value={selectedGlobalAIModel}
          onChange={handleInputChange}
          options={AVAILABLE_AI_MODELS}
          containerClassName="mb-4"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <Select
              label="Genre"
              id="selectedGenreOption"
              name="selectedGenreOption"
              value={selectedGenreOption}
              onChange={handleInputChange}
              options={genreOptions}
              required
            />
            {selectedGenreOption === CUSTOM_OPTION_VALUE && (
              <Input
                id="customGenreText"
                name="customGenreText"
                value={customGenreText}
                onChange={handleInputChange}
                placeholder="Enter your custom genre"
                className="mt-2"
                required
              />
            )}
          </div>
          <div>
            <Select
              label="Sub-Genre (Optional)"
              id="selectedSubGenreOption"
              name="selectedSubGenreOption"
              value={selectedSubGenreOption}
              onChange={handleInputChange}
              options={subGenreFinalOptions}
              disabled={selectedGenreOption === CUSTOM_OPTION_VALUE || subGenreFinalOptions.length === 0}
            />
             {(selectedSubGenreOption === CUSTOM_OPTION_VALUE && selectedGenreOption !== CUSTOM_OPTION_VALUE) && (
              <Input
                id="customSubGenreText"
                name="customSubGenreText"
                value={customSubGenreText}
                onChange={handleInputChange}
                placeholder="Enter your custom sub-genre"
                className="mt-2"
                required
              />
            )}
             {selectedGenreOption === CUSTOM_OPTION_VALUE && ( // Show custom sub-genre text field if main genre is custom
                <Input
                    label="Custom Sub-Genre (Optional)"
                    id="customSubGenreTextForCustomGenre"
                    name="customSubGenreText" // Still targets the same state
                    value={customSubGenreText}
                    onChange={handleInputChange}
                    placeholder="Enter custom sub-genre"
                    className="mt-2"
                />
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          <Select
            label="Target Novel Length"
            id="targetNovelLength"
            name="targetNovelLength"
            value={idea.targetNovelLength}
            onChange={handleInputChange}
            options={TARGET_NOVEL_LENGTHS.map(l => ({ value: l.id, label: l.label }))}
          />
          <Input
            label="Target Words Per Chapter"
            id="targetChapterWordCount"
            name="targetChapterWordCount"
            type="number"
            value={idea.targetChapterWordCount.toString()}
            onChange={handleInputChange}
            min="1000"
            step="500"
            placeholder="e.g., 8000"
          />
           <Select
            label="Target Chapter Count"
            id="targetChapterCount"
            name="targetChapterCount"
            value={String(idea.targetChapterCount || '')}
            onChange={handleInputChange}
            options={TARGET_CHAPTER_COUNTS}
            required
          />
        </div>

        <h2 className="text-xl font-semibold text-sky-400 pt-4 border-t border-slate-700">Narrative & Stylistic Modifiers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Select
            label="Point of View (POV)"
            id="pointOfView"
            name="pointOfView"
            value={idea.pointOfView}
            onChange={handleInputChange}
            options={POVS.map(p => ({ value: p, label: p }))}
          />
          <Select
            label="Tense"
            id="pointOfViewTense"
            name="pointOfViewTense"
            value={idea.pointOfViewTense}
            onChange={handleInputChange}
            options={POINT_OF_VIEW_TENSES.map(t => ({ value: t, label: t }))}
          />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <Select
            label="Prose Complexity"
            id="proseComplexity"
            name="proseComplexity"
            value={idea.proseComplexity}
            onChange={handleInputChange}
            options={PROSE_COMPLEXITY_OPTIONS.map(p => ({ value: p, label: p }))}
          />
          <Select
            label="Pacing"
            id="pacing"
            name="pacing"
            value={idea.pacing}
            onChange={handleInputChange}
            options={PACING_OPTIONS.map(p => ({ value: p, label: p }))}
          />
        </div>
        <TextArea
          label="Narrative Tone (comma-separated)"
          id="narrativeTone"
          name="narrativeTone"
          value={idea.narrativeTone}
          onChange={handleInputChange}
          placeholder={`e.g., ${NARRATIVE_TONE_EXAMPLES.slice(0,3).join(', ')}`}
          rows={2}
        />

        <h2 className="text-xl font-semibold text-sky-400 pt-4 border-t border-slate-700">Content & Thematic Modifiers</h2>
        <TextArea
          label="Core Themes (comma-separated)"
          id="coreThemes"
          name="coreThemes"
          value={idea.coreThemes}
          onChange={handleInputChange}
          placeholder="e.g., Redemption, Betrayal, Identity, Man vs. Technology"
          rows={2}
        />
        <Input
          label="Setting - Era & Location"
          id="settingEraLocation"
          name="settingEraLocation"
          value={idea.settingEraLocation}
          onChange={handleInputChange}
          placeholder="e.g., 1940s Los Angeles, A generation starship mid-journey"
          list="time-period-suggestions"
        />
        <datalist id="time-period-suggestions">
            {EXAMPLE_TIME_PERIODS.map(tp => <option key={tp} value={tp} />)}
        </datalist>
        <TextArea
          label="Setting - Atmosphere (comma-separated)"
          id="settingAtmosphere"
          name="settingAtmosphere"
          value={idea.settingAtmosphere}
          onChange={handleInputChange}
          placeholder={`e.g., ${SETTING_ATMOSPHERE_EXAMPLES.slice(0,3).join(', ')}`}
          rows={2}
        />
        <Select
          label="Character Count (Approx.)"
          id="characterCount"
          name="characterCount"
          value={idea.characterCount}
          onChange={handleInputChange}
          options={CHARACTER_COUNTS.map(c => ({ value: c, label: c }))}
        />
        <TextArea
          label="Literary/Media/Real-world/Historical Influences (Optional)"
          id="literaryInfluences"
          name="literaryInfluences"
          value={idea.literaryInfluences}
          onChange={handleInputChange}
          placeholder="e.g., Inspired by Philip K. Dick, The Iliad, alternate history WW2, Metal Gear Solid universe..."
          rows={3}
        />


        {projectError && (
          <div className="p-3 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-sm">
            <p className="font-semibold">Error:</p>
            <p>{projectError}</p>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <Button type="submit" isLoading={isProjectLoading} size="lg" disabled={isSuggestingModifiers || isProjectLoading}>
            Create Novel Project & Begin
          </Button>
        </div>
      </form>

      <IdeaSparkModal
        isOpen={isIdeaSparkModalOpen}
        onClose={() => {
          setIsIdeaSparkModalOpen(false);
          clearIdeaSparkSuggestions(); 
        }}
        suggestions={ideaSparkSuggestions}
        currentTitle={title}
        currentIdea={idea} // Pass the main idea state
        onApply={handleApplyIdeaSparkSuggestions}
        isLoading={isSuggestingModifiers}
        error={projectError} 
      />

      <style>{`
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NewProjectPage;