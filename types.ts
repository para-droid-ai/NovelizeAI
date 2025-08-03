

export interface TimeLog {
  startTime: number; // Unix timestamp in ms
  endTime: number; // Unix timestamp in ms
  durationMs: number;
}

export interface SystemLogEntry {
  timestamp: number;
  message: string;
}

export interface SourceDataFile {
  id: string;
  name: string;
  type: string; // mime type
  content: string;
}

export interface NovelIdea {
  initialIdea: string;
  genre: string; // e.g., Fantasy, Sci-Fi
  subGenre?: string; // e.g., Cyberpunk, Space Opera (optional)
  
  targetNovelLength: string; // e.g., "Novella", "Standard Novel", "Epic"
  targetChapterWordCount: number; // e.g., 5000, 8000, 10000
  targetChapterCount?: number; // e.g., 10, 20, 50

  pointOfView: string; // e.g., "First Person", "Third Person Limited"
  pointOfViewTense: string; // e.g., "Past Tense", "Present Tense"
  
  narrativeTone: string; // Comma-separated or descriptive, e.g., "Dark, Humorous", "Lyrical & Poetic"
  proseComplexity: string; // e.g., "Simple", "Standard", "Complex / Literary"
  pacing: string; // e.g., "Slow-burn", "Fast-paced"

  coreThemes: string; // Comma-separated, e.g., "Redemption, Betrayal, Identity"
  settingEraLocation: string; // e.g., "1940s Los Angeles", "A generation starship mid-journey"
  settingAtmosphere: string; // Comma-separated, e.g., "Oppressive, Dystopian", "Hopeful & Utopian"
  
  characterCount: string; // e.g., "1-2 main", "3-5 key", "Large cast" (Kept from previous)
  literaryInfluences?: string; // NEW: e.g., "Philip K. Dick, The Iliad, Metal Gear Solid"
}

export interface ChapterOutline {
  chapterNumber: number;
  workingTitle: string;
  briefSynopsis: string; // 1-2 sentences of its core purpose/events
  keyContinuityPoints: string[]; // Short list of crucial plot/character developments
}

export interface InitialAISetupPlan {
  conceptAndPremise: string; // AI verbalization output for Phase 1
  charactersAndSetting: string; // AI verbalization output for Phase 2
  overallPlotOutline: string; // AI verbalization output for Phase 3
  logLine?: string; // Parsed from AI output
  synopsis?: string; // Parsed from AI output
  chapterOutlines?: ChapterOutline[]; // NEW: Outline for each chapter
  inProcessAmendments?: string; // NEW: AI's scratchpad for evolving context
  timing?: TimeLog;
}

export interface ChapterContent {
  chapterNumber: number;
  title?: string;
  plan: string; // AI verbalization output for Phase 4 & 5
  prose: string; // AI generated chapter text
  review: string; // AI verbalization output for chapter review
  userFeedbackForRevision?: string;
  planUserFeedback?: string; // Feedback specifically for re-planning this chapter
  proseUserFeedback?: string; // Feedback specifically for rewriting prose
  reviewUserFeedback?: string; // Feedback specifically for rewriting review
  isRevised?: boolean;
  autoRevisionRecommendedByAI?: boolean; // Stores AI's direct recommendation
  autoRevisionReasonsFromAI?: string; // Stores AI's reasons for revision
  planTiming?: TimeLog;
  proseTiming?: TimeLog;
  reviewTiming?: TimeLog;
  revisionTimings?: TimeLog[];
  modelUsed?: string;
}

export interface NovelProject {
  id: string;
  title: string; // User-defined or AI-suggested then user-confirmed
  idea: NovelIdea;
  sourceData?: SourceDataFile[];
  initialAISetupPlan?: InitialAISetupPlan;
  chapters: ChapterContent[];
  currentChapterProcessing: number; // Chapter number being worked on (planning, writing, reviewing)
  selectedGlobalAIModel: string; // NEW: To store the selected AI model
  lastTurnDurationMs?: number; // NEW: To store duration of the last AI task
  createdAt: string;
  updatedAt: string;
  systemLog?: SystemLogEntry[];
  // Future: Add settings for "Ideas Beyond" like agent configuration
}

export enum ProcessStage {
  SETUP = 'SETUP',
  INITIAL_PLANNING = 'INITIAL_PLANNING',
  CHAPTER_PLANNING = 'CHAPTER_PLANNING',
  CHAPTER_WRITING = 'CHAPTER_WRITING',
  CHAPTER_REVIEWING = 'CHAPTER_REVIEWING',
  CHAPTER_REVISING = 'CHAPTER_REVISING', // This implies prose has been revised.
  // Consider adding CHAPTER_REPLANNING if plan revision is a distinct user-facing stage
  COMPLETED = 'COMPLETED',
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web: GroundingChunkWeb;
}

// For AI Idea Spark Feature
export interface IdeaSparkSuggestions {
  suggestedProjectTitle?: string;
  suggestedInitialIdeaRefinement?: string;
  genre?: string;
  subGenre?: string;
  targetNovelLength?: string;
  targetChapterWordCount?: number;
  targetChapterCount?: number;
  pointOfView?: string;
  pointOfViewTense?: string;
  narrativeTone?: string;
  proseComplexity?: string;
  pacing?: string;
  coreThemes?: string;
  settingEraLocation?: string;
  settingAtmosphere?: string;
  characterCount?: string;
  literaryInfluences?: string; // NEW
}

// For User State and Global Context
export interface GlobalContextLogEntry {
  id: string; // NEW: Unique identifier for each log entry
  projectId: string;
  projectName: string;
  type: 'characterName' | 'coreConcept' | 'keyTrope' | 'setting';
  element: string;
  role?: string; // e.g., 'Protagonist', 'Antagonist', 'Supporting'
  archetype?: string;
}

export interface UserState {
  userId: string;
  globalContextLog: GlobalContextLogEntry[];
}