
# Novelize AI: Auto Mode

## Introduction

Auto Mode in Novelize AI is designed to streamline the novel creation process by automating the sequential generation of content. Once activated, it allows the AI to proceed through the defined stages of novel development (initial planning, chapter planning, prose writing, AI review, and then moving to the next chapter) without requiring manual clicks for each step. This feature aims to provide a more hands-off experience for users who wish to see their novel unfold progressively with AI assistance.

## Features

*   **Automated Step-by-Step Progression:**
    *   Auto Mode follows the logical sequence of novel creation:
        1.  Generates the Initial AI Plan (Phases 1-3) if not already present.
        2.  For each chapter:
            *   Generates the detailed Chapter Plan.
            *   Writes the Chapter Prose based on the plan.
            *   Generates an AI Review of the written prose.
        3.  Proceeds to plan the next chapter until the target chapter count is reached.
*   **Pause and Resume Functionality:**
    *   Users can pause Auto Mode at any time, allowing them to review the current state or make manual interventions.
    *   Auto Mode can be resumed, and it will attempt to pick up from the current state of the project.
*   **AI-Driven Revisions:**
    *   After the AI completes a review for a chapter, the system checks if the AI recommends a revision for that chapter (based on "AUTO_REVISION_RECOMMENDED: YES" in the AI's review output).
    *   If a revision is recommended, Auto Mode can automatically trigger a revision process using the AI's own feedback points.
    *   **Revision Limit:** To prevent infinite loops and excessive API calls, there's a limit of **1 automated revision attempt per chapter** during a single Auto Mode session for that chapter.
    *   **Limit Reached:** If the AI still recommends revisions after the maximum automated attempts, Auto Mode will pause for that chapter, and a status message will inform the user, suggesting manual review and intervention.

## UI Controls

*   **"Enable Auto Mode" Toggle/Button:**
    *   Located on the `ProjectDashboardPage`.
    *   A switch or button to turn Auto Mode on or off.
    *   When turned on, `autoRevisionsAttempted` for each chapter is typically reset for the new auto mode session for that chapter.
*   **"Pause Auto Mode" Button:**
    *   Visible when Auto Mode is active and not paused.
    *   Allows the user to temporarily halt the automated sequence. Manual action buttons become enabled.
*   **"Resume Auto Mode" Button:**
    *   Visible when Auto Mode is active and paused.
    *   Allows the user to continue the automated sequence from where it left off. Manual action buttons become disabled again.
*   **"Disable Auto Mode" Button:**
    *   Visible when Auto Mode is active.
    *   Allows the user to turn off Auto Mode completely.

## Status Display

*   An **Auto Mode Status Message** is displayed prominently on the `ProjectDashboardPage` when Auto Mode is active or has been active.
*   This message provides real-time updates on:
    *   The current action being performed by the AI (e.g., "Auto: Planning Chapter 3...").
    *   Decisions made by the system (e.g., "Auto: AI review for Chapter 2 complete. No AI revision needed.").
    *   Automated revision attempts and their status.
    *   Reasons for pausing (e.g., error encountered, max revision attempts reached).

## Workflow Example (with potential auto-revision)

1.  User enables Auto Mode for a project.
2.  Status: "Auto: Generating initial novel plan..." (If not done)
3.  AI completes initial plan. Status: "Auto: Initial plan complete. Planning Chapter 1..."
4.  AI completes plan for Chapter 1. Status: "Auto: Plan for Chapter 1 complete. Writing prose..."
5.  AI completes prose for Chapter 1. Status: "Auto: Prose for Chapter 1 complete. Reviewing chapter..."
6.  AI completes review for Chapter 1.
    *   **Scenario A (No Revision Recommended by AI):** Status: "Auto: Review for Chapter 1 complete. No AI revision needed. Proceeding to plan Chapter 2..."
    *   **Scenario B (Revision Recommended by AI):**
        *   Status: "Auto: AI recommends revision for Chapter 1. Attempting automated revision (1/1)..."
        *   AI revises Chapter 1 based on its own review feedback. The chapter's `prose` is updated, `isRevised` flag is set, and `review` is cleared.
        *   Status: "Auto: Chapter 1 revised. Moving to re-review..."
        *   AI re-reviews the revised Chapter 1.
        *   If AI still recommends revision after the re-review: Status: "Auto: Max automated revisions for Chapter 1 reached. AI still recommends changes. Pausing Auto Mode for manual review." (Auto Mode pauses).
        *   If the revised chapter's review indicates no further revision: Status: "Auto: Review for revised Chapter 1 complete. No further AI revision needed. Proceeding to plan Chapter 2..."
7.  The cycle continues for subsequent chapters until the target chapter count is reached or the novel is otherwise deemed complete by the system.
8.  If the novel reaches the target chapter count and all steps for the final chapter are done, the status will indicate completion (e.g., "Auto: All chapters processed and reviewed. Novel complete!"). Auto Mode deactivates.

## Error Handling

*   If an error occurs during any AI generation step while Auto Mode is active (e.g., API error, parsing failure), Auto Mode will automatically pause.
*   The `autoModeStatusMessage` and the general error display area on the `ProjectDashboardPage` will show information about the error.
*   The user will then need to address the issue (if possible) or manually proceed before potentially resuming Auto Mode.

## User Intervention

*   Users can pause Auto Mode at any point to take manual control (e.g., manually revise a chapter, adjust plans).
*   If Auto Mode is resumed after manual actions, it will assess the project's current state and attempt to continue the automated sequence from the appropriate next step.
*   If a user manually revises a chapter for which automated revisions were attempted (and Auto Mode is paused or off), the `autoRevisionsAttempted` count for that chapter may be reset, allowing Auto Mode to try again if resumed and revision is still needed.
*   Turning Auto Mode off completely stops all automated actions. Turning it back on will restart the process based on the current project status, resetting `autoRevisionsAttempted`.

This Auto Mode feature aims to make Novelize AI an even more powerful co-writing partner, capable of handling extended generation sequences while still allowing for user oversight and control.
