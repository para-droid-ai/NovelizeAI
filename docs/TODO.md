
# TODO: Implementing "Idea Spark" (AI Modifier Suggestion)

This document outlines the immediate next steps for developing the "Idea Spark" feature, which allows the AI to suggest novel modifiers based on a user's initial idea for Novelize AI.

## Backend & AI Service (`geminiService.ts`)

1.  **Define JSON Output Schema for "Idea Spark":**
    *   **Action:** Formally document the expected JSON structure the AI should return. This structure should closely mirror the fields in the `NovelIdea` TypeScript interface.
    *   **Example Snippet (Conceptual):**
        ```json
        {
          "genre": "Sci-Fi",
          "subGenre": "Cyberpunk",
          "targetNovelLength": "standard_novel",
          // ... all other NovelIdea fields
          "suggestedInitialIdeaRefinement": "Optional: A slightly rephrased initial idea for better clarity or impact."
        }
        ```
    *   **Consideration:** Include an optional field for the AI to suggest minor refinements to the user's `initialIdea` itself, if it enhances coherence with the suggested modifiers.

2.  **Develop System Prompt for "Idea Spark":**
    *   **Action:** Craft a new system prompt specifically for this feature.
    *   **Key Instructions for AI:**
        *   Receive user's `initialIdea` text.
        *   Analyze the text for underlying themes, potential genres, narrative styles, etc.
        *   Role: Act as a creative assistant helping to flesh out a novel concept.
        *   Task: Suggest values for ALL fields defined in the `NovelIdea` type (list them explicitly in the prompt).
        *   Guidance: Ensure suggestions are coherent with each other and logically flow from the user's `initialIdea`.
        *   Output Format: MUST return suggestions in the predefined JSON structure. Use `responseMimeType: "application/json"`.
        *   If the user's idea is very specific about one aspect (e.g., "a first-person cyberpunk story"), respect that and build around it.

3.  **Create `suggestNovelModifiers` Function in `geminiService.ts`:**
    *   **Signature:** `async suggestNovelModifiers(initialIdeaText: string): Promise<Partial<NovelIdea>>`
    *   **Implementation:**
        *   Construct the full prompt using the system prompt from step 2 and the user's `initialIdeaText`.
        *   Make the API call to Gemini, ensuring `config: { responseMimeType: "application/json" }` is set.
        *   Receive the response. Access `response.text` and parse it as JSON.
        *   **Crucial:** Implement robust error handling for API errors and JSON parsing failures (e.g., if AI output is not valid JSON despite instructions).
        *   Return the parsed `Partial<NovelIdea>` object.

## Frontend (`NewProjectPage.tsx`, `ProjectContext.tsx`, new Modal)

4.  **Update `ProjectContext.tsx`:**
    *   **Action:** Add a new function to handle the "Idea Spark" logic.
    *   **Signature:** `async fetchAndApplyModifierSuggestions(initialIdeaText: string): Promise<Partial<NovelIdea> | null>`
    *   **Implementation:**
        *   Set `isLoading` state to true. Clear any previous errors.
        *   Call `geminiService.suggestNovelModifiers(initialIdeaText)`.
        *   Store the returned suggestions.
        *   Set `isLoading` to false. Handle/set errors if any.
        *   Return suggestions for the UI to handle. (The context itself won't directly apply them to a project yet, but will facilitate fetching for the form).

5.  **UI Enhancements on `NewProjectPage.tsx`:**
    *   **"Suggest Modifiers with AI" Button:**
        *   Add a visually distinct button (e.g., "Spark Ideas with AI ✨").
        *   Disable this button if the "Initial Novel Idea" textarea is empty or below a certain character count (e.g., 20 characters) to ensure there's enough input for the AI.
    *   **Button Action:**
        *   On click, call the new context function `fetchAndApplyModifierSuggestions`, passing the current `idea.initialIdea` text.
        *   Display a loading indicator while waiting for AI response.

6.  **"AI Suggestions" Modal Component:**
    *   **Action:** Create a new reusable modal component (or adapt the existing one if suitable) specifically for displaying AI suggestions.
    *   **Content:**
        *   When suggestions are received from the context, display them clearly.
        *   For each modifier, show the AI's suggested value. It might be useful to also show the user's current value in the form for comparison if they had already filled some.
        *   Display any "suggestedInitialIdeaRefinement" if provided by the AI.
    *   **Actions:**
        *   "Apply Suggestions": Takes the AI suggestions and updates the `idea` state in `NewProjectPage.tsx`. The user might select which ones to apply. (Start with "Apply All" for simplicity, can add per-field later).
        *   "Cancel"/"Close": Discards suggestions and closes the modal.
    *   **State Management:** The `NewProjectPage` will manage the `isOpen` state for this modal and pass down the AI-fetched suggestions.

7.  **Logic for Pre-filling Form in `NewProjectPage.tsx`:**
    *   **Action:** When the user clicks "Apply Suggestions" in the modal.
    *   **Implementation:**
        *   Iterate through the AI-suggested `NovelIdea` object.
        *   Update the corresponding fields in the local `idea` state of `NewProjectPage`.
        *   Ensure type conversions are handled correctly (e.g., `targetChapterWordCount` to number).

## Testing & Refinement

8.  **Thorough Testing:**
    *   Test with a variety of `initialIdea` inputs (short, long, specific, vague).
    *   Verify the AI provides relevant and coherent suggestions.
    *   Check the reliability of JSON parsing.
    *   Test the UI flow: button enabling/disabling, loading states, modal display, and form pre-filling.
    *   Test error handling (API errors, invalid JSON from AI).
9.  **Prompt Iteration:**
    *   Based on testing, refine the system prompt for "Idea Spark" to improve the quality and consistency of AI suggestions.

This set of tasks focuses on delivering the "Idea Spark" feature end-to-end for Novelize AI.