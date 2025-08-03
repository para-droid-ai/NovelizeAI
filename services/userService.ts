
import { UserState, GlobalContextLogEntry } from '../types';

const USER_STATE_KEY = 'novelizeAIUserState';

export const getUserState = (): UserState => {
  try {
    const stateJson = localStorage.getItem(USER_STATE_KEY);
    if (!stateJson) {
        const newState: UserState = { userId: crypto.randomUUID(), globalContextLog: [] };
        saveUserState(newState);
        return newState;
    }
    const state = JSON.parse(stateJson) as UserState;
    // Retroactively add IDs to any old log entries that don't have one
    let needsUpdate = false;
    state.globalContextLog.forEach(entry => {
        if (!entry.id) {
            entry.id = crypto.randomUUID();
            needsUpdate = true;
        }
    });
    if (needsUpdate) {
        saveUserState(state);
    }
    return state;
  } catch (error) {
    console.error("Error fetching user state from localStorage:", error);
    const fallbackState: UserState = { userId: crypto.randomUUID(), globalContextLog: [] };
    saveUserState(fallbackState);
    return fallbackState;
  }
};

export const saveUserState = (state: UserState): void => {
  try {
    localStorage.setItem(USER_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving user state to localStorage:", error);
  }
};

export const addGlobalContextLogEntries = (entries: GlobalContextLogEntry[]): UserState => {
    const state = getUserState();
    const entriesWithIds = entries.map(e => e.id ? e : { ...e, id: crypto.randomUUID() });
    
    // Filter out any entries that might already exist for the project being logged to avoid duplicates on re-generation
    const otherProjectEntries = state.globalContextLog.filter(entry => entry.projectId !== entries[0]?.projectId);
    const updatedLog = [...otherProjectEntries, ...entriesWithIds];
    const newState = { ...state, globalContextLog: updatedLog };
    saveUserState(newState);
    return newState;
};

export const addSingleGlobalContextLogEntry = (entry: GlobalContextLogEntry): UserState => {
    const state = getUserState();
    const entryWithId = entry.id ? entry : { ...entry, id: crypto.randomUUID() };
    const updatedLog = [...state.globalContextLog, entryWithId];
    const newState = { ...state, globalContextLog: updatedLog };
    saveUserState(newState);
    return newState;
};

export const deleteGlobalContextLogEntry = (entryId: string): UserState => {
    const state = getUserState();
    const updatedLog = state.globalContextLog.filter(entry => entry.id !== entryId);
    const newState = { ...state, globalContextLog: updatedLog };
    saveUserState(newState);
    return newState;
};


export const getGlobalContextLog = (excludeProjectId?: string): GlobalContextLogEntry[] => {
    const state = getUserState();
    if (excludeProjectId) {
        return state.globalContextLog.filter(entry => entry.projectId !== excludeProjectId);
    }
    return state.globalContextLog;
};
