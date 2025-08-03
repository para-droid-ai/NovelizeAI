
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserState, GlobalContextLogEntry } from '../types';
import * as UserService from '../services/userService';

type NewLogEntryData = Omit<GlobalContextLogEntry, 'id' | 'projectId'>;

interface UserContextType {
  userState: UserState | null;
  logGlobalElements: (entries: Omit<GlobalContextLogEntry, 'id'>[]) => void;
  getGlobalContextAsString: (excludeProjectId?: string) => string;
  addLogEntry: (newEntryData: NewLogEntryData) => void;
  deleteLogEntry: (entryId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userState, setUserState] = useState<UserState | null>(null);

  useEffect(() => {
    const state = UserService.getUserState();
    setUserState(state);
  }, []);

  const logGlobalElements = useCallback((entries: Omit<GlobalContextLogEntry, 'id'>[]) => {
    if (entries.length === 0) return;
    const entriesWithIds: GlobalContextLogEntry[] = entries.map(e => ({...e, id: crypto.randomUUID()}));
    const newState = UserService.addGlobalContextLogEntries(entriesWithIds);
    setUserState(newState);
  }, []);

  const addLogEntry = useCallback((newEntryData: NewLogEntryData) => {
    const newEntry: GlobalContextLogEntry = {
        ...newEntryData,
        id: crypto.randomUUID(),
        projectId: 'manual' // Mark manually added entries
    };
    const newState = UserService.addSingleGlobalContextLogEntry(newEntry);
    setUserState(newState);
  }, []);

  const deleteLogEntry = useCallback((entryId: string) => {
    const newState = UserService.deleteGlobalContextLogEntry(entryId);
    setUserState(newState);
  }, []);


  const getGlobalContextAsString = useCallback((excludeProjectId?: string): string => {
    const log = UserService.getGlobalContextLog(excludeProjectId);
    if (!log || log.length === 0) {
        return "No previous creative elements logged.";
    }

    const groupedByProject: { [key: string]: GlobalContextLogEntry[] } = log.reduce((acc, entry) => {
        const key = entry.projectId === 'manual' ? "Manually Added Entries" : `From Project: "${entry.projectName}"`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(entry);
        return acc;
    }, {} as { [key: string]: GlobalContextLogEntry[] });
    
    let logString = "";
    for (const projectName of Object.keys(groupedByProject)) {
        logString += `${projectName}:\n`;
        const entries = groupedByProject[projectName];
        const characters = entries.filter(e => e.type === 'characterName').map(e => `  - Character: ${e.element} (${e.role || 'Unknown Role'})`).join('\n');
        const concepts = entries.filter(e => e.type === 'coreConcept').map(e => `  - Core Concept: ${e.element}`).join('\n');
        const tropes = entries.filter(e => e.type === 'keyTrope').map(e => `  - Key Trope: ${e.element}`).join('\n');
        const settings = entries.filter(e => e.type === 'setting').map(e => `  - Setting: ${e.element}`).join('\n');

        if (characters) logString += characters + '\n';
        if (concepts) logString += concepts + '\n';
        if (tropes) logString += tropes + '\n';
        if (settings) logString += settings + '\n';
        logString += '\n';
    }
    
    return logString.trim();
  }, []);

  return (
    <UserContext.Provider value={{ userState, logGlobalElements, getGlobalContextAsString, addLogEntry, deleteLogEntry }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
