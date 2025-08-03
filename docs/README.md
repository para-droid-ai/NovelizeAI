
# Novelize AI

## 1. Intentions & Vision

Novelize AI is a web application designed to empower writers of all levels to bring their novel ideas to life with the assistance of advanced AI. It aims to transform the often daunting task of writing a full-length narrative into a structured, manageable, and creatively stimulating process.

Our core intention is to:
- Provide a framework that guides users from initial concept to a completed multi-chapter novel.
- Leverage the power of Large Language Models (LLMs) like Google's Gemini API for sophisticated planning, prose generation, and content review.
- Offer users significant control over the creative direction through detailed modifiers and iterative feedback loops.
- Demystify the novel writing process by breaking it down into distinct, AI-assisted phases.
- Create a dynamic dashboard where users can track progress, manage generated content, and interact with the AI.

The vision is not to replace the human author, but to provide a powerful co-creation tool that handles heavy lifting in drafting and structuring, allowing the user to focus on the creative essence, plot intricacies, and unique voice of their story.

## 2. Inspirations

This project is inspired by:
- The potential of customized system prompts observed in platforms like Google GEMS and Perplexity Spaces, demonstrating how tailored instructions can elicit complex, structured output from LLMs.
- The desire to move beyond simple prompt-response interactions and build a dedicated application that orchestrates a longer, multi-stage creative workflow.
- The evolving capabilities of generative AI, particularly the Gemini API, in areas like long-form text generation, instruction following, and nuanced content creation.
- The general need for tools that make creative writing more accessible and less intimidating.

## 3. Expected App Outcome & Core Features (Current & Implemented)

Novelize AI currently allows users to:

-   **Initiate Projects:** Start a new novel project by inputting an initial idea and selecting various detailed modifiers, including:
    *   **Structural & Scoping:** Genre, Sub-Genre, Target Novel Length, Target Chapter Word Count.
    *   **Narrative & Stylistic:** Point of View (POV type & tense), Narrative Tone (comma-separated), Prose Complexity, Pacing.
    *   **Content & Thematic:** Core Themes (comma-separated), Setting (Era & Location, Atmosphere via comma-separated tags), Character Count.
-   **AI-Driven Initial Planning:** Once a project is created, the AI can generate a comprehensive initial plan based on the user's idea and modifiers. This plan includes:
    *   **Phase 1: Concept & Premise Development** (verbalized by AI)
    *   **Phase 2: Character & Setting Development** (verbalized by AI)
    *   **Phase 3: Overall Plot Outline** (verbalized by AI)
    *   The application parses and displays key elements like a suggested **Logline** and **Synopsis** from this initial plan.
-   **Chapter-by-Chapter Generation Workflow:**
    *   **Detailed Chapter Planning:** For the current chapter, the AI produces a hyper-detailed blueprint (Phase 4 & 5 of its internal rules), outlining scenes, key beats, and techniques for elaboration to meet the target chapter word count. This plan considers the overall plot and the review of the previous chapter (if applicable).
    *   **Prose Generation:** Based on the approved chapter plan, the AI writes the full prose for the chapter, aiming for the specified word count and stylistic choices.
    *   **AI Review & Analysis:** After prose generation, the AI performs a self-review of the chapter, assessing its adherence to the plan, depth, quality, and word count. This review informs the planning for the *next* chapter.
-   **User Interaction & Control:**
    *   **Sequential Process:** Users guide the AI through each step: initial plan, chapter plan, chapter prose, chapter review.
    *   **Revision Capability:** Users can provide feedback for any generated chapter, and the AI will attempt to revise the prose based on this feedback, the original plan, and style guides. Revised chapters are marked.
    *   **Progressive Workflow:** The dashboard guides the user on the next logical step for the current chapter (e.g., "Write Prose" if plan is done, "Review Chapter" if prose is done).
-   **Project Dashboard:**
    *   A central hub displaying the active project's title, genre, and current processing stage.
    *   Sections for the overall novel plan (logline, synopsis, phase 1-3 details).
    *   Focused area for the current chapter being worked on, showing its plan, prose, and review as they are generated.
    *   Collapsible sections for previously completed chapters, allowing review of their plans, prose, and reviews.
    *   Word count display for generated chapter prose, with visual indicators comparing actual count to target.
-   **AI Performance Metrics & System Log (NEW):**
    *   **Live Timings Widget:** A dedicated widget on the dashboard provides a live look at AI generation times, including total project time, current task duration, and the average time per step.
    *   **Detailed Timings & Log:** The system automatically logs the duration of every AI generation (Initial Plan, Chapter Plan, Prose, Review, Revisions). A "System Log & Timings" modal provides aggregate statistics and a collapsible, timestamped log of all system actions for full transparency.
-   **Save & Export:**
    *   Project progress is automatically saved to the browser's Local Storage.
    *   Users can export the full novel (title, synopsis, and all chapter prose) as a single `.txt` file, or the entire project state (including all plans, timings, and metadata) as a `.json` file for backup or sharing.
-   **Project Management:**
    *   A home page lists all projects, showing title, genre, chapters, and last updated date.
    *   Users can open existing projects or delete them.

## 4. AI-Powered Ideation & Optimization (Current & Planned Features)

To enhance the creative partnership between the user and the AI, Novelize AI includes and envisions the following features:

*   **"Idea Spark" - Vague Idea Expansion (Implemented):**
    *   **Concept:** For users with a nascent or vague idea, this feature allows the AI to analyze the initial concept and suggest a full set of detailed modifiers (genre, tone, themes, setting, etc.).
    *   **Interaction:** Users input their basic idea on the "New Project" page, then click a button like "Spark Ideas with AI ✨." A modal displays the AI's suggestions, which the user can then review and apply to the project creation form.
    *   **Goal:** To quickly transform a simple thought into a well-defined project blueprint.

*   **"Random Muse" - Full Concept Generation (Planned):**
    *   **Concept:** For users seeking fresh inspiration, the AI will brainstorm and generate a complete novel concept from scratch, including an `initialIdea` and all associated modifiers.
    *   **Interaction:** A button like "Generate Random Novel Concept" on the "New Project" page. The AI's full concept is presented in a modal, which the user can accept to populate their new project form.
    *   **Goal:** To provide a starting point when users face a blank page.

*   **"Concept Optimizer" - Existing Idea Refinement (Planned):**
    *   **Concept:** For projects already defined, this feature allows the AI to act as a "creative consultant." It will analyze the existing `NovelIdea` (initial concept text and all modifiers) and suggest improvements for coherence, originality, or impact.
    *   **Interaction:** Accessed from the `ProjectDashboardPage`, the AI would provide feedback and alternative suggestions for modifiers or the core concept, along with rationale. Users could selectively apply these optimizations.
    *   **Goal:** To help users refine and strengthen their novel's foundation.

These ideation tools leverage structured JSON output from the Gemini API to ensure suggestions can be easily parsed and integrated into the application's UI, making the AI a more proactive partner in the earliest stages of novel creation.

## 5. High-Level Application Structure

-   **Frontend:** React with TypeScript, Vite (assumed from `index.html` setup using ES modules and import maps).
-   **Styling:** Tailwind CSS.
-   **AI Integration:** `@google/genai` SDK (version ^1.6.0 via esm.sh) for Gemini API.
-   **Routing:** React Router (version ^7.6.2 via esm.sh).
-   **State Management:** React Context API (`ProjectContext`) for managing active project, list of projects, loading states, and errors.
-   **Persistence:** Browser Local Storage (`localStorage`) via `projectService.ts` for storing `NovelProject` data.
-   **Core UI Components (`components/`):**
    *   `Layout.tsx`: Main application shell.
    *   `Button.tsx`, `Input.tsx`, `TextArea.tsx`, `Select.tsx`: Reusable form elements.
    *   `Modal.tsx`: For pop-up interactions (e.g., revision feedback).
    *   `LoadingSpinner.tsx`: Visual feedback for asynchronous operations.
    *   `ProjectCard.tsx`: Displays project summaries on the `HomePage`.
    *   `AITimingWidget.tsx`: Displays live AI performance metrics.
    *   (Implicitly) `SectionCard.tsx` (nested in `ProjectDashboardPage`): Collapsible sections for content.
-   **Pages (`pages/`):**
    *   `HomePage.tsx`: Lists projects, allows creation/deletion.
    *   `NewProjectPage.tsx`: Form for inputting initial idea and all detailed modifiers.
    *   `ProjectDashboardPage.tsx`: Main workspace for an active novel, managing the AI interaction workflow and displaying generated content.
-   **Services (`services/`):**
    *   `projectService.ts`: Handles CRUD operations for `NovelProject` data in Local Storage.
    *   `geminiService.ts`: Manages all interactions with the Gemini API, including prompt construction, API calls, and parsing of AI responses (text and structured data like loglines/synopses).
-   **Contexts (`contexts/`):**
    *   `ProjectContext.tsx`: Centralizes application state and orchestrates calls to services.
-   **Utilities (`src/utils/`):**
    *   `textUtils.ts`: Text-related utility functions (e.g., `countWords`).
    *   `timeUtils.ts`: Time-formatting utility functions for performance metrics.
-   **Types (`types.ts`):** Defines all TypeScript interfaces (e.g., `NovelIdea`, `NovelProject`, `ChapterContent`).
-   **Constants (`constants.ts`):** Stores system prompt templates (as functions accepting `targetChapterWordCount` and other parameters), API model names, UI selection options (genres, POVs, etc.).

## 6. Core Logic & Workflow (User & AI Interaction)

The application's logic is driven by a structured, phased approach managed via `ProjectContext` and executed by `geminiService`, based on detailed system prompts provided to the Gemini API:

1.  **Project Creation (`NewProjectPage`):**
    *   User inputs a project title, their initial novel idea, and selects numerous modifiers defining structure, style, and content.
    *   This `NovelIdea` object forms the basis of the new `NovelProject`.

2.  **Initial AI Setup (`ProjectDashboardPage`):**
    *   User initiates "Generate Initial AI Plan."
    *   `geminiService.generateInitialNovelPlan(activeProject.idea)` is called.
    *   The AI performs `Phase 1 (Concept & Premise)`, `Phase 2 (Characters & Setting)`, and `Phase 3 (Overall Plot Outline)` based on the `NovelIdea`.
    *   The extensive verbalized output is parsed by `geminiService.parseInitialPlanOutput` and `geminiService.extractNovelTitleAndSynopsis` to populate `activeProject.initialAISetupPlan` (including logline and synopsis) and potentially update the project title. The time taken is logged.

3.  **Chapter Cycle (`ProjectDashboardPage` - Iterative for `activeProject.currentChapterProcessing`):**
    *   **A. Chapter Planning:**
        *   User initiates "Generate Plan for Chapter X."
        *   `geminiService.generateChapterPlan(...)` is called, using the overall plot outline, previous chapter's review (if X > 1), and `targetChapterWordCount`.
        *   AI verbalizes its `Phase 4 (Hyper-Detailed Blueprint)` and `Phase 5 (Readiness Check)`.
        *   The output is parsed and saved to the current chapter's `plan` field, and the time taken is logged.
    *   **B. Prose Generation:**
        *   User initiates "Write Chapter X Prose."
        *   `geminiService.generateChapterProse(...)` is called, using the approved chapter plan and `targetChapterWordCount`.
        *   AI generates the chapter's narrative.
        *   Output is parsed (extracting optional chapter title) and saved to the current chapter's `prose` field, and the time taken is logged.
    *   **C. AI Review:**
        *   User initiates "Generate AI Review for Chapter X."
        *   `geminiService.generateChapterReview(...)` is called, using the generated prose, plan, and `targetChapterWordCount`.
        *   AI performs its `<chapter_review_analysis>`.
        *   Output is parsed and saved to the current chapter's `review` field, and the time taken is logged.
    *   **D. User Checkpoint & Progression:**
        *   After AI review, the chapter is considered "complete" for the current cycle.
        *   User can choose to:
            *   **Revise Chapter:** Provide feedback via a modal. The entire chapter (plan and prose) is regenerated based on this feedback. The time for this revision is also logged.
            *   **Proceed to Next Chapter:** Increments `currentChapterProcessing`. The cycle repeats from (A) for the new chapter number.

4.  **Data Persistence:** All project data, including AI-generated plans, prose, reviews, and all generation timings, is saved to Local Storage via `projectService.ts` after each significant update.
