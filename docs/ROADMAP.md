
# Feature Roadmap: AI-Powered Idea Generation & Optimization

## 1. Introduction

This roadmap outlines the development plan for a suite of AI-powered features designed to enhance the initial creative process within Novelize AI. These tools aim to help users overcome writer's block, flesh out nascent ideas, generate entirely new concepts, and refine existing project blueprints. The core principle is to leverage AI not just for drafting, but for collaborative ideation and conceptualization.

## 2. Core Feature Components

### Feature 1: "Idea Spark" - Vague Idea Expansion

*   **Goal:** Assist users who have a general or vague novel idea by using AI to suggest a full set of detailed modifiers, providing a robust starting point for their project.
*   **User Input:**
    *   Primary: The user's initial novel idea (a sentence or short paragraph).
    *   (Optional) User might pre-select a genre if they have one in mind.
*   **AI Process:**
    1.  Receive the user's initial idea.
    2.  Analyze the idea for thematic content, potential genre implications, inherent tone, and possible narrative structures.
    3.  Generate suggestions for all relevant `NovelIdea` fields:
        *   `genre`, `subGenre`
        *   `targetNovelLength`, `targetChapterWordCount` (derived from novel length)
        *   `pointOfView`, `pointOfViewTense`
        *   `narrativeTone` (suggest a few comma-separated descriptive terms)
        *   `proseComplexity`
        *   `pacing`
        *   `coreThemes` (suggest a few comma-separated themes)
        *   `settingEraLocation`
        *   `settingAtmosphere` (suggest a few comma-separated terms)
        *   `characterCount`
    4.  Return these suggestions in a structured JSON format, ensuring `responseMimeType: "application/json"` is used for the API call.
*   **UI Integration:**
    *   A new button on the `NewProjectPage.tsx`, e.g., "AI Suggest Modifiers ✨" or "Flesh out with AI".
    *   This button becomes active after the user types a minimum amount into the "Initial Novel Idea" field.
    *   On click, trigger a modal displaying the AI's suggestions for each modifier.
    *   The modal will allow users to review and selectively apply suggestions to the `NewProjectPage` form fields or apply all.
    *   Clear visual distinction between user's original input and AI's suggestions within the modal.

### Feature 2: "Random Muse" - Full Concept Generation

*   **Goal:** Provide users with a completely fresh novel concept when they are looking for inspiration or have no specific starting point.
*   **User Input:**
    *   (Optional) User might provide a single keyword, a very high-level theme (e.g., "betrayal in space"), or select a broad genre. If no input, AI generates freely.
*   **AI Process:**
    1.  If user input is provided, use it as a seed for brainstorming.
    2.  AI brainstorms a core concept, a central conflict, and a unique "what if" scenario.
    3.  Develops a very brief conceptual mindmap or a short narrative hook.
    4.  Generates a *new* `initialIdea` string based on this brainstorm.
    5.  Generates suggestions for all other `NovelIdea` fields, consistent with the newly generated `initialIdea`.
    6.  Return the new `initialIdea` and all modifier suggestions in a structured JSON format.
*   **UI Integration:**
    *   A new button on `NewProjectPage.tsx`, e.g., "Spark a Random Novel Idea 🎲".
    *   On click, trigger a modal.
    *   The modal displays the AI-generated `initialIdea` and all suggested modifiers.
    *   User can accept the entire concept (which populates all fields on `NewProjectPage`, including the project title with a suggestion), request another random idea, or cancel.

### Feature 3: "Concept Optimizer" - Existing Idea Refinement

*   **Goal:** Help users refine an already defined `NovelIdea` (a complete set of modifiers and an initial concept) by providing AI-driven feedback and suggestions for improvement.
*   **User Input:** An existing, fully populated `NovelIdea` object.
*   **AI Process:**
    1.  AI receives the complete `NovelIdea` (initial text and all selected modifiers).
    2.  Acts as a "Novel Doctor" or "Creative Consultant."
    3.  Analyzes the coherence, originality, and potential appeal of the combined concept and modifiers.
    4.  Identifies potential weaknesses, areas for strengthening, or opportunities for more compelling synergy between elements (e.g., "The chosen 'fast-paced' pacing might conflict with the 'introspective & philosophical' tone for this particular sci-fi subgenre. Consider...").
    5.  Suggests specific, actionable changes or alternative options for certain modifiers, or even slight tweaks to the `initialIdea` text to better align with the modifiers.
    6.  Provides a brief rationale for each key suggestion.
    7.  Returns suggestions and rationale in a structured JSON format.
*   **UI Integration:**
    *   A button available on the `ProjectDashboardPage` (perhaps after the initial AI plan is generated, or in a dedicated "Refine Concept" section), e.g., "Optimize Novel Concept with AI 🔬".
    *   On click, trigger a modal.
    *   The modal displays the user's current `NovelIdea` alongside the AI's suggested optimizations and rationale for each.
    *   Users can choose to selectively apply individual suggestions to their active project's `NovelIdea`.

## 3. Technical Considerations

*   **New Gemini API Prompts:** Each of the three features will require uniquely crafted system prompts tailored to its specific goal (suggestion, generation, optimization). These prompts must clearly instruct the AI on its role and the desired structured JSON output.
*   **JSON Schema Definition:** A well-defined JSON schema for the AI's output is critical for reliable parsing and UI integration for each feature. This schema will largely mirror the `NovelIdea` type, but for the "Optimizer," it might include additional fields for "suggestion_rationale."
*   **Robust JSON Parsing:** The `geminiService.ts` will need functions to handle potential inconsistencies or errors in the AI's JSON output, perhaps with fallback mechanisms.
*   **UI Modals & Interaction:** Interactive modals will be essential for presenting AI suggestions and allowing users to apply them.
*   **State Management:** Logic in `ProjectContext` and `NewProjectPage` (or `ProjectDashboardPage` for the optimizer) will be needed to manage the AI interaction lifecycle (request, loading, display, apply).
*   **User Experience:** Clear visual cues, intuitive controls, and the ability to easily accept or reject AI suggestions are paramount.

## 4. Phased Implementation Plan for This Feature Suite

This feature suite will be developed iteratively:

*   **Iteration 1: "Idea Spark" (Vague Idea Expansion)**
    *   **Focus:** Implement the core functionality of taking a user's basic idea and having the AI suggest a full set of modifiers. This addresses a common user need and establishes the foundational JSON parsing and UI modal interaction patterns.
*   **Iteration 2: "Random Muse" (Full Concept Generation)**
    *   **Focus:** Build upon the "Idea Spark" infrastructure to allow the AI to generate a complete novel concept from scratch or a minimal seed. This involves a different AI prompt but similar UI/data handling.
*   **Iteration 3: "Concept Optimizer" (Existing Idea Refinement)**
    *   **Focus:** Tackle the more nuanced task of AI-driven critique and suggestion for an existing concept. This will require the most sophisticated AI prompt and a UI that clearly differentiates original values from AI suggestions.
*   **Iteration 4: Enhancements & User Feedback**
    *   Refine prompts based on output quality.
    *   Improve UI/UX based on usability.
    *   Consider adding controls for "creativity level" or "specificity" for AI suggestions.

This phased approach allows for incremental delivery of value and learning from each stage to inform the next.