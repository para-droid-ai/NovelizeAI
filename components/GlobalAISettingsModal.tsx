
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';
import { AVAILABLE_AI_MODELS, DEFAULT_GEMINI_TEXT_MODEL } from '../constants';
import { useProject } from '../contexts/ProjectContext';

interface GlobalAISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalAISettingsModal: React.FC<GlobalAISettingsModalProps> = ({ isOpen, onClose }) => {
  const { activeProject, updateSelectedGlobalAIModel, isLoading: isProjectContextLoading } = useProject();
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_GEMINI_TEXT_MODEL);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (activeProject?.selectedGlobalAIModel) {
      setSelectedModel(activeProject.selectedGlobalAIModel);
    } else {
      setSelectedModel(DEFAULT_GEMINI_TEXT_MODEL);
    }
  }, [activeProject, isOpen]);

  const handleSave = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    await updateSelectedGlobalAIModel(selectedModel);
    setIsSaving(false);
    onClose();
  };

  const currentModelLabel = AVAILABLE_AI_MODELS.find(m => m.value === activeProject?.selectedGlobalAIModel)?.label || activeProject?.selectedGlobalAIModel;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global AI Model Settings" size="md">
      <div className="p-2">
        <p className="text-sm text-slate-400 mb-4">
          Select the AI model that will be used for all generation tasks within this project.
          Changes will be applied to future AI interactions.
        </p>
        <p className="text-xs text-slate-500 mb-1">Current Project Model: <span className="font-semibold text-slate-300">{currentModelLabel}</span></p>
        
        <div className="mb-6">
          <label htmlFor="globalAiModelSelect" className="block text-sm font-medium text-green-400 mb-1">
            Global AI Model:
          </label>
          <Select
            id="globalAiModelSelect"
            options={AVAILABLE_AI_MODELS}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-700 border-green-500 text-slate-100 focus:ring-green-500 focus:border-green-600"
            containerClassName="mb-0" 
          />
           <p className="mt-2 text-xs text-slate-500">
            Note: Model capabilities and token limits vary. Changing models might affect generation quality or consistency.
          </p>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose} disabled={isSaving || isProjectContextLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            isLoading={isSaving || isProjectContextLoading} 
            disabled={selectedModel === (activeProject?.selectedGlobalAIModel || DEFAULT_GEMINI_TEXT_MODEL)}
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GlobalAISettingsModal;
