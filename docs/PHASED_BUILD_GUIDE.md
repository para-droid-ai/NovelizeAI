
# Novelize AI - Phased Build Guide

This document outlines the phased development plan for the Novelize AI application. It is a living document and will be updated as the project progresses.

## Core Technologies:

-   **Frontend:** React (Vite/CRA), TypeScript
-   **Styling:** Tailwind CSS
-   **AI Integration:** `@google/genai` SDK for Gemini API
-   **Routing:** React Router
-   **State Management:** React Context API
-   **Persistence:** Browser Local Storage

## Phase 0: Project Setup & Foundational UI (Current State as of Modifiers Update)

-   **Task 0.1:** Initialize React project with TypeScript. (DONE)
-   **Task 0.2:** Install necessary dependencies: `react-router-dom`, `@google/genai`, `tailwindcss`. (DONE, using esm.sh imports)
-   **Task 0.3:** Basic project structure: `src/components`, `src/pages`, `src/services`, `src/contexts`, `src/types`, `src/constants`. (DONE, though `src/` prefix is not consistently used for top-level files like `App.tsx`, `index.tsx` based on provided structure. Assume paths are relative to where `index.html` is for now.)
-   **Task 0.4:** Implement `Layout` component (header, footer, main content area). (DONE)
-   **Task 0.5:** Setup basic routing for `HomePage`, `NewProjectPage`, `ProjectDashboardPage`. (DONE)
-   **Task 0.6:** Create `ProjectService` for basic CRUD operations on `NovelProject` using Local Storage. (DONE)
-   **Task 0.7:** Implement `HomePage` to list projects (from Local Storage) and link to `NewProjectPage`. (DONE)
    -   `ProjectCard` component. (DONE)
    -   Delete project functionality. (DONE)
-   **Task 0.8:** Implement `NewProjectPage` form with all current detailed modifiers. (DONE)
    -   Inputs for project title, initial idea.
    -   Selects/TextAreas for: Genre, Sub-Genre, Target Novel Length, Target Chapter Word Count, Point of View (Type & Tense), Narrative Tone, Prose Complexity, Pacing, Core Themes, Setting (Era & Location, Atmosphere), Character Count.
-   **Task 0.9:** Define `NovelProject` and related types in `types.ts` to reflect all modifiers. (DONE)
-   **Task 0.10:** Setup `ProjectContext` to manage active project state and interactions with `ProjectService`. (DONE)
-   **Task 0.11:** `Constants.ts` file for system prompts (as functions), API models, UI options (genres, POVs, etc.). (DONE)
-   **Task 0.12:** Basic UI components: `Button`, `Input`, `TextArea`, `Select`, `Modal`, `LoadingSpinner`. (DONE)

## Phase 1: Core AI Integration - Initial Planning (Largely DONE)

-   **Task 1.1:** Setup `geminiService.ts` with API key handling (environment variable `process.env.API_KEY`). (DONE)
-   **Task 1.2:** Implement `generateInitialNovelPlan` function in `geminiService.ts`. (DONE)
    -   Constructs the full prompt using `SYSTEM_PROMPT_GOAL_FN`, `PLANNING_RULES_INITIAL_SETUP_TEMPLATE_FN` (incorporating all user idea details and modifiers), `NOVEL_STRUCTURE_AND_STYLE_FN`, `OUTPUT_INSTRUCTIONS_TEMPLATE_FN`.
    -   Calls Gemini API.
-   **Task 1.3:** Implement parser functions in `geminiService.ts` (`parseInitialPlanOutput`, `extractNovelTitleAndSynopsis`) to extract structured data from AI's verbalized plan. (DONE)
-   **Task 1.4:** Integrate `generateInitialNovelPlan` into `ProjectContext`. (DONE)
-   **Task 1.5:** On `ProjectDashboardPage`: (DONE)
    -   If `activeProject.initialAISetupPlan` is missing, show a button "Generate Initial AI Plan".
    *   On click, call the context function.
    *   Display loading state.
    *   Once complete, display the parsed `conceptAndPremise`, `charactersAndSetting`, `overallPlotOutline`, `logLine`, and `synopsis`. Update project title if AI suggests one.
-   **Task 1.6:** Refine `constants.ts` to make prompt parts (goal, style, output instructions) functions that accept `targetChapterWordCount` and other necessary parameters. Update `geminiService.ts` to use these functional prompt parts. (DONE)

## Phase 2: Chapter Workflow - Planning, Writing, Reviewing (Largely DONE)

-   **Task 2.1:** Implement `generateChapterPlan` in `geminiService.ts`. (DONE)
    -   Accepts `projectTitle`, `chapterNumber`, `overallPlotOutline`, `previousChapterReviewAnalysis`, `targetChapterWordCount`.
    -   Constructs prompt using `PLANNING_RULES_CHAPTER_N_TEMPLATE_FN`.
    -   Implement `parseChapterPlanOutput`.
-   **Task 2.2:** Integrate `generateChapterPlan` into `ProjectContext` and `ProjectDashboardPage`. (DONE)
    -   Button "Generate Plan for Chapter X" appears when appropriate.
    -   Display chapter plan.
-   **Task 2.3:** Implement `generateChapterProse` in `geminiService.ts`. (DONE)
    -   Accepts `projectTitle`, `chapterNumber`, `chapterPlan`, `targetChapterWordCount`.
    -   Constructs prompt.
    -   Implement `parseChapterProseOutput` (to extract optional chapter title and prose).
-   **Task 2.4:** Integrate `generateChapterProse` into `ProjectContext` and `ProjectDashboardPage`. (DONE)
    -   Button "Write Chapter X Prose" appears after plan is available.
    -   Display chapter prose.
-   **Task 2.5:** Implement `generateChapterReview` in `geminiService.ts`. (DONE)
    -   Accepts `projectTitle`, `chapterNumber`, `generatedProse`, `chapterPlan`, `targetChapterWordCount`.
    -   Constructs prompt using `CHAPTER_REVIEW_ANALYSIS_TEMPLATE_FN`.
    -   Implement `parseChapterReviewOutput`.
-   **Task 2.6:** Integrate `generateChapterReview` into `ProjectContext` and `ProjectDashboardPage`. (DONE)
    -   Button "Generate AI Review for Chapter X" appears after prose is available.
    -   Display chapter review.
-   **Task 2.7:** Implement logic in `ProjectDashboardPage` to manage `currentStage` (e.g., `SETUP`, `CHAPTER_PLANNING`, `CHAPTER_WRITING`, `CHAPTER_REVIEWING`, `COMPLETED`) based on available data for `activeProject.currentChapterProcessing`. (DONE)
-   **Task 2.8:** Implement "Proceed to Next Chapter" button, which increments `activeProject.currentChapterProcessing` and resets stage for the new chapter. (DONE)

## Phase 3: Revisions and Export (Largely DONE)

-   **Task 3.1:** Implement `reviseChapterProse` in `geminiService.ts`. (DONE)
    -   Accepts `projectTitle`, `chapterNumber`, `originalPlan`, `originalProse`, `userFeedback`, `targetChapterWordCount`.
    -   Constructs prompt using `REVISE_CHAPTER_PROMPT_TEMPLATE_FN`.
-   **Task 3.2:** Integrate `reviseChapterProse` into `ProjectContext`. (DONE)
-   **Task 3.3:** On `ProjectDashboardPage`: (DONE)
    -   Add "Revise Chapter" button for each chapter (current and completed).
    -   Use a `Modal` to get `userFeedback` (TextArea).
    -   On submit, call context function. Update chapter prose, mark as revised, clear old review.
-   **Task 3.4:** Implement "Export to TXT" functionality on `ProjectDashboardPage`. (DONE)
    -   Concatenate project title, logline, synopsis, and all chapter prose.
-   **Task 3.5:** UI improvements for displaying multiple chapters (e.g., accordions/`SectionCard` for past chapters). (DONE)

## Phase 4: Advanced Features & UX Enhancements (Current primary focus for new development)

-   **Task 4.1:** **Word Count Display:** (DONE)
    -   Implement client-side word counting for generated prose sections (`src/utils/textUtils.ts`).
    -   Display this count next to chapters/prose views on `ProjectDashboardPage`.
    -   Visually indicate if it's significantly off from `targetChapterWordCount` using color-coded text.
-   **Task 4.2: AI-Powered Idea Generation & Optimization (NEW - See `docs/ROADMAP.md` and `docs/TODO.md`)**
    *   **Sub-Phase 4.2.1: "Idea Spark" - Vague Idea Expansion** (In Progress / Partially DONE for Novelize AI)
        *   Define JSON output schema for AI suggestions. (DONE)
        *   Develop system prompt for AI to analyze initial idea and suggest full `NovelIdea` modifiers. (DONE)
        *   Implement `suggestNovelModifiers` in `geminiService.ts` using `responseMimeType: "application/json"`. (DONE)
        *   Integrate into `ProjectContext`. (DONE)
        *   Add UI button and modal on `NewProjectPage` to trigger suggestions and allow user to apply them to the form. (DONE)
    *   **Sub-Phase 4.2.2: "Random Muse" - Full Concept Generation** (Future, after Idea Spark)
        *   Develop system prompt for AI to brainstorm a new `initialIdea` and all modifiers.
        *   Implement service and UI similar to "Idea Spark."
    *   **Sub-Phase 4.2.3: "Concept Optimizer" - Existing Idea Refinement** (Future, after Random Muse)
        *   Develop system prompt for AI to analyze a complete `NovelIdea` and suggest improvements.
        *   Implement service and UI on `ProjectDashboardPage`.
-   **Task 4.3:** **Automated Length Feedback (Basic):** (Future)
    -   If chapter prose word count is X% below/above target, when user clicks "Generate AI Review", augment the review prompt to also ask the AI to comment on how length could be adjusted in a revision.
-   **Task 4.4 (Stretch):** **Automated Length-Focused Revision Prompt:** (Future)
    -   If length is off, provide a specific "Adjust Length" button that triggers a specialized revision prompt asking the AI to expand or condense the chapter to meet the target word count, suggesting areas from its own plan or review.
-   **Task 4.5:** Explore "Agent Orchestrator" concept (design phase first, Future).
-   **Task 4.6:** Storyboard Creator (requires Imagen API integration, separate service, significant UI work, Future).
-   **Task 4.7:** TTS "Live Storyteller" (requires TTS API, audio playback controls, Future).
-   **Task 4.8:** PDF Export (Future).
-   **Task 4.9:** More robust error handling and user feedback across the application.
-   **Task 4.10:** UI/UX polish based on user testing and feature additions.
-   **Task 4.11:** Add more "deep and useful modifiers" as identified (e.g., Narrative Style, Ending Type, Core Tropes). Update UI and prompts accordingly (Ongoing consideration).

## Phase 5: Deployment & Maintenance

-   **Task 5.1:** Setup deployment pipeline (e.g., GitHub Pages, Netlify, Vercel).
-   **Task 5.2:** Final testing across browsers.
-   **Task 5.3:** Ongoing maintenance and bug fixes.
-   **Task 5.4:** Monitor API usage and costs.

This guide provides a roadmap for Novelize AI. Priorities and specific tasks within phases may be adjusted based on development progress and feedback.