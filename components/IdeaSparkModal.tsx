
import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { IdeaSparkSuggestions, NovelIdea } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface IdeaSparkModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: IdeaSparkSuggestions | null;
  currentTitle: string; // For context, not directly modified here
  currentIdea: NovelIdea; // For context/comparison
  onApply: (appliedSuggestions: IdeaSparkSuggestions) => void;
  isLoading: boolean;
  error?: string | null;
}

const SuggestionItem: React.FC<{ label: string; suggestedValue?: string | number; currentValue?: string | number; note?: string }> = ({ label, suggestedValue, currentValue, note }) => {
  if (suggestedValue === undefined || suggestedValue === null || suggestedValue === '') {
    return null; // Don't show if no suggestion
  }
  return (
    <div className="py-2 border-b border-slate-700 last:border-b-0">
      <p className="text-sm font-medium text-sky-300">{label}</p>
      <p className="text-slate-100 whitespace-pre-wrap">
        <span className="font-semibold">Suggestion:</span> {String(suggestedValue)}
      </p>
      {currentValue !== undefined && String(currentValue) !== String(suggestedValue) && (
         <p className="text-xs text-slate-400 mt-0.5">(Current: {String(currentValue)})</p>
      )}
      {note && <p className="text-xs text-slate-500 italic mt-0.5">{note}</p>}
    </div>
  );
};

const IdeaSparkModal: React.FC<IdeaSparkModalProps> = ({
  isOpen,
  onClose,
  suggestions,
  currentIdea,
  onApply,
  isLoading,
  error
}) => {
  if (!isOpen) return null;

  const handleApply = () => {
    if (suggestions) {
      onApply(suggestions);
    }
    onClose(); 
  };
  
  const renderContent = () => {
    if (isLoading) {
      return <LoadingSpinner text="AI is sparking ideas..." size="lg" className="my-8" />;
    }
    if (error) {
        return <div className="p-4 bg-red-900/30 text-red-300 rounded-md my-4">{error}</div>;
    }
    if (!suggestions) {
      return <p className="text-slate-400 my-4">No suggestions available. Try generating them!</p>;
    }

    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        <SuggestionItem 
            label="Suggested Project Title" 
            suggestedValue={suggestions.suggestedProjectTitle} 
        />
        <SuggestionItem 
            label="Suggested Initial Idea Refinement" 
            suggestedValue={suggestions.suggestedInitialIdeaRefinement}
            note="This could replace or augment your current initial idea."
        />
        <SuggestionItem label="Genre" suggestedValue={suggestions.genre} currentValue={currentIdea.genre} />
        <SuggestionItem label="Sub-Genre" suggestedValue={suggestions.subGenre} currentValue={currentIdea.subGenre} />
        <SuggestionItem label="Target Novel Length" suggestedValue={suggestions.targetNovelLength} currentValue={currentIdea.targetNovelLength} />
        <SuggestionItem label="Target Chapter Word Count" suggestedValue={suggestions.targetChapterWordCount} currentValue={currentIdea.targetChapterWordCount} />
        <SuggestionItem label="Target Chapter Count" suggestedValue={suggestions.targetChapterCount} currentValue={currentIdea.targetChapterCount} />
        <SuggestionItem label="Point of View" suggestedValue={suggestions.pointOfView} currentValue={currentIdea.pointOfView} />
        <SuggestionItem label="POV Tense" suggestedValue={suggestions.pointOfViewTense} currentValue={currentIdea.pointOfViewTense} />
        <SuggestionItem label="Narrative Tone" suggestedValue={suggestions.narrativeTone} currentValue={currentIdea.narrativeTone} note="Comma-separated values." />
        <SuggestionItem label="Prose Complexity" suggestedValue={suggestions.proseComplexity} currentValue={currentIdea.proseComplexity} />
        <SuggestionItem label="Pacing" suggestedValue={suggestions.pacing} currentValue={currentIdea.pacing} />
        <SuggestionItem label="Core Themes" suggestedValue={suggestions.coreThemes} currentValue={currentIdea.coreThemes} note="Comma-separated values." />
        <SuggestionItem label="Setting - Era & Location" suggestedValue={suggestions.settingEraLocation} currentValue={currentIdea.settingEraLocation} />
        <SuggestionItem label="Setting - Atmosphere" suggestedValue={suggestions.settingAtmosphere} currentValue={currentIdea.settingAtmosphere} note="Comma-separated values." />
        <SuggestionItem label="Character Count" suggestedValue={suggestions.characterCount} currentValue={currentIdea.characterCount} />
        <SuggestionItem label="Literary/Media/Historical Influences" suggestedValue={suggestions.literaryInfluences} currentValue={currentIdea.literaryInfluences} note="Influences to shape style, theme, or world." />
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ AI Idea Spark Suggestions" size="xl">
      <div className="text-sm text-slate-400 mb-4">
        Review the AI's suggestions below. You can apply these to your current novel blueprint.
      </div>
      {renderContent()}
      {!isLoading && !error && suggestions && (
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} variant="primary">
            Apply Suggestions
          </Button>
        </div>
      )}
       {(error || (!isLoading && !suggestions && !error)) && (
         <div className="mt-6 flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>
                Close
            </Button>
         </div>
       )}
        <style>{`
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #1e293b; /* slate-800 */
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #475569; /* slate-600 */
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #334155; /* slate-700 */
            }
        `}</style>
    </Modal>
  );
};

export default IdeaSparkModal;