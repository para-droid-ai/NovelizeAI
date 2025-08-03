
import { GoogleGenAI, GenerateContentResponse, Part, Content } from "@google/genai";
import { SYSTEM_PROMPT_PARTS, DEFAULT_GEMINI_TEXT_MODEL } from '../constants';
import { NovelIdea, InitialAISetupPlan, IdeaSparkSuggestions, ChapterOutline, SourceDataFile } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn(
    "Gemini API Key not found. Please set the API_KEY environment variable. App may not function correctly."
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

async function generateWithGemini(
    modelName: string,
    prompt: string | Part | (string | Part)[],
    requestJsonOutput: boolean = false
  ): Promise<GenerateContentResponse> {
  if (!API_KEY) {
    throw new Error("Gemini API Key is not configured.");
  }
  try {
    const resolvedContents: Content[] = typeof prompt === 'string'
        ? [{role: "user", parts: [{text: prompt}] }]
        : Array.isArray(prompt)
            ? [{role: "user", parts: prompt.map(p => (typeof p === 'string' ? {text: p} : p)) }]
            : [{role: "user", parts: [prompt as Part] }];

    const modelConfig: Record<string, any> = {};
    if (requestJsonOutput) {
        modelConfig.responseMimeType = "application/json";
    }
    
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName || DEFAULT_GEMINI_TEXT_MODEL,
        contents: resolvedContents,
        config: modelConfig
    });
    return response;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        const geminiErrorDetails = (error as any).details || (error as any).errorInfo;
        if (geminiErrorDetails) {
            throw new Error(`Gemini API Error: ${error.message} (Details: ${JSON.stringify(geminiErrorDetails)})`);
        }
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("Unknown error calling Gemini API");
  }
}

export const generateInitialNovelPlan = async (idea: NovelIdea, modelName: string, globalContextLog: string, sourceData?: SourceDataFile[], rewriteContext?: string): Promise<string> => {
  const {
    initialIdea,
    genre,
    subGenre,
    targetNovelLength,
    targetChapterWordCount,
    targetChapterCount,
    pointOfView,
    pointOfViewTense,
    narrativeTone,
    proseComplexity,
    pacing,
    coreThemes,
    settingEraLocation,
    settingAtmosphere,
    characterCount,
    literaryInfluences // Added
  } = idea;

  let sourceDataSummary: string | undefined;
  if (sourceData && sourceData.length > 0) {
    sourceDataSummary = sourceData.map(file => 
      `--- Source File: ${file.name} ---\n${file.content.substring(0, 4000)}` // Truncate to avoid huge prompts
    ).join('\n\n');
  }

  const goalPrompt = SYSTEM_PROMPT_PARTS.SYSTEM_PROMPT_GOAL_FN(targetChapterWordCount);
  const planningRules = SYSTEM_PROMPT_PARTS.PLANNING_RULES_INITIAL_SETUP_TEMPLATE_FN(
    initialIdea,
    genre,
    subGenre,
    targetNovelLength,
    targetChapterWordCount,
    targetChapterCount,
    pointOfView,
    pointOfViewTense,
    narrativeTone,
    proseComplexity,
    pacing,
    coreThemes,
    settingEraLocation,
    settingAtmosphere,
    characterCount,
    literaryInfluences, // Added
    globalContextLog, // NEW
    sourceDataSummary
  );
  const novelStructureStyle = SYSTEM_PROMPT_PARTS.NOVEL_STRUCTURE_AND_STYLE_FN(targetChapterWordCount);
  const outputInstructions = SYSTEM_PROMPT_PARTS.OUTPUT_INSTRUCTIONS_TEMPLATE_FN('INITIAL_SETUP_ONLY', targetChapterWordCount);

  const fullPrompt = `
${goalPrompt}
${planningRules}
${novelStructureStyle}
${outputInstructions}
${SYSTEM_PROMPT_PARTS.USER_COMMANDS}
${rewriteContext ? `
**IMPORTANT REWRITE CONTEXT:** The user has provided the following context for a full rewrite of this plan: "${rewriteContext}". Please generate a completely new plan based on the original idea AND this new context. This context should be prioritized in shaping the new plan.
` : ''}
The user's initial idea is: "${initialIdea}". Literary Influences: "${literaryInfluences || 'None specified'}".
Please proceed with generating the initial setup (Novel Title, Logline, Synopsis, followed by verbalization of Phases 1-3 including ChapterOutlines and initial evolvingStoryContextLog) as per the <planning_rules> and <output> instructions.
Your output MUST start with the Novel Title prefixed by '# ', then Logline prefixed by 'Logline: ', then Synopsis prefixed by 'Synopsis: '.
Following that, provide the detailed verbalization for Phases 1-3 ONLY. Do NOT plan Chapter 1 in this output.
  `;
  const response = await generateWithGemini(modelName, fullPrompt);
  return response.text;
};

export const generateChapterPlan = async (
  projectTitle: string,
  chapterNumber: number,
  overallPlotOutline: string,
  currentChapterOutlineSynopsis: string, 
  evolvingStoryContextLog: string, 
  targetChapterWordCount: number,
  modelName: string,
  literaryInfluences?: string,
  previousChapterReviewAnalysis?: string,
  planRevisionFeedback?: string,
  sourceData?: SourceDataFile[]
): Promise<string> => {
  let sourceDataSummary: string | undefined;
  if (sourceData && sourceData.length > 0) {
      sourceDataSummary = sourceData.map(file =>
          `--- Source File: ${file.name} ---\n${file.content.substring(0, 4000)}`
      ).join('\n\n');
  }

  const goalPrompt = SYSTEM_PROMPT_PARTS.SYSTEM_PROMPT_GOAL_FN(targetChapterWordCount);
  const planningRules = SYSTEM_PROMPT_PARTS.PLANNING_RULES_CHAPTER_N_TEMPLATE_FN(
      chapterNumber, 
      overallPlotOutline, 
      currentChapterOutlineSynopsis, 
      evolvingStoryContextLog, 
      targetChapterWordCount, 
      literaryInfluences,
      previousChapterReviewAnalysis, 
      planRevisionFeedback,
      sourceDataSummary
  );
  const novelStructureStyle = SYSTEM_PROMPT_PARTS.NOVEL_STRUCTURE_AND_STYLE_FN(targetChapterWordCount);
  const outputPhase = 'PLAN_CURRENT_CHAPTER'; 
  const outputInstructions = SYSTEM_PROMPT_PARTS.OUTPUT_INSTRUCTIONS_TEMPLATE_FN(outputPhase, targetChapterWordCount, chapterNumber, false);


  const fullPrompt = `
${goalPrompt}
The novel title is: "${projectTitle}".
We are now planning for Chapter ${chapterNumber}.
Stated Literary Influences for the novel: "${literaryInfluences || 'None specified'}".
${planningRules}
${novelStructureStyle}
${outputInstructions} 
${SYSTEM_PROMPT_PARTS.USER_COMMANDS}

Please provide the hyper-detailed plan for Chapter ${chapterNumber} as per the <planning_rules> and <output> instructions, including proposing a workingTitle and identifying any KEY_CHAPTER_DEVELOPMENTS_FROM_PLAN.
Your output should *only* be the planning verbalization for Chapter ${chapterNumber}.
The target length for this chapter is ~${targetChapterWordCount} words.
${planRevisionFeedback ? `This is a REVISED plan. Ensure your new plan for Chapter ${chapterNumber} addresses the feedback: "${planRevisionFeedback}".` : `If Chapter ${chapterNumber > 1 ? chapterNumber-1 : 'N/A'} review analysis was provided, incorporate its findings into your planning process.`}
  `;

  const response = await generateWithGemini(modelName, fullPrompt);
  return response.text;
};


export const generateChapterProse = async (
  projectTitle: string,
  chapterNumber: number,
  chapterPlan: string, 
  targetChapterWordCount: number,
  modelName: string,
  proseRevisionFeedback?: string
): Promise<string> => {
  const goalPrompt = SYSTEM_PROMPT_PARTS.SYSTEM_PROMPT_GOAL_FN(targetChapterWordCount);
  const novelStructureStyle = SYSTEM_PROMPT_PARTS.NOVEL_STRUCTURE_AND_STYLE_FN(targetChapterWordCount);
  const outputInstructions = SYSTEM_PROMPT_PARTS.OUTPUT_INSTRUCTIONS_TEMPLATE_FN('GENERATE_CHAPTER', targetChapterWordCount, chapterNumber);

  let workingTitleInstruction = "Ensure the chapter header includes the workingTitle provided in the plan.";
  const titleMatchInPlan = chapterPlan.match(/workingTitle:\s*(.*?)\n/i);
  if (titleMatchInPlan && titleMatchInPlan[1]) {
      workingTitleInstruction = `The working title for this chapter is "${titleMatchInPlan[1].trim()}". Ensure the chapter header is formatted as '## Chapter ${chapterNumber}: ${titleMatchInPlan[1].trim()}'.`;
  }


  const fullPrompt = `
${goalPrompt}
The novel title is: "${projectTitle}".
We are now writing Chapter ${chapterNumber}.
${workingTitleInstruction}
The target length for this chapter is ~${targetChapterWordCount} words.
The detailed plan for this chapter is as follows:
<chapter_plan_for_chapter_${chapterNumber}>
${chapterPlan}
</chapter_plan_for_chapter_${chapterNumber}>

${novelStructureStyle}
${outputInstructions}
${SYSTEM_PROMPT_PARTS.USER_COMMANDS}
${proseRevisionFeedback ? `
**IMPORTANT REWRITE CONTEXT:** The user has provided specific feedback for rewriting this prose: "${proseRevisionFeedback}". You MUST generate new prose that follows the chapter plan but incorporates this feedback. The tone and focus of your new prose should be guided by this feedback.
` : ''}
Based *only* on the provided plan for Chapter ${chapterNumber}, generate the full prose for this chapter.
Adhere strictly to the <novel_structure_and_style> and aim for the substantial depth and length (~${targetChapterWordCount} words) implied by the plan.
The chapter header MUST be in the format '## Chapter ${chapterNumber}: [Chapter Title From Plan]'.
Do NOT include any review analysis or planning for subsequent chapters in this output. Your output must ONLY be the prose for Chapter ${chapterNumber}.
  `;
  const response = await generateWithGemini(modelName, fullPrompt);
  return response.text;
};

export const generateChapterReview = async (
  projectTitle: string,
  chapterNumber: number,
  generatedProse: string,
  chapterPlan: string,
  targetChapterWordCount: number,
  isFinalChapter: boolean,
  modelName: string,
  literaryInfluences?: string,
  sourceData?: SourceDataFile[],
  reviewRevisionFeedback?: string
): Promise<string> => {
  let sourceDataSummary: string | undefined;
  if (sourceData && sourceData.length > 0) {
      sourceDataSummary = sourceData.map(file =>
          `--- Source File: ${file.name} ---\n${file.content.substring(0, 2000)}`
      ).join('\n\n');
  }

  const goalPrompt = SYSTEM_PROMPT_PARTS.SYSTEM_PROMPT_GOAL_FN(targetChapterWordCount);
  const reviewInstructionsTemplate = SYSTEM_PROMPT_PARTS.CHAPTER_REVIEW_ANALYSIS_TEMPLATE_FN(
      chapterNumber, generatedProse, chapterPlan, targetChapterWordCount, isFinalChapter, literaryInfluences, sourceDataSummary
  );
  
  // Inject feedback into the template if it exists
  const reviewInstructions = reviewRevisionFeedback 
    ? reviewInstructionsTemplate.replace(
        '**Procedure (Perform AFTER Chapter', 
        `**Procedure (Perform AFTER Chapter\n**IMPORTANT USER FEEDBACK FOR THIS REVIEW:** The user has provided the following feedback on a previous review attempt: "${reviewRevisionFeedback}". Your new analysis MUST take this feedback into account. Address their points directly in your evaluation.`
      )
    : reviewInstructionsTemplate;

  const outputInstructions = SYSTEM_PROMPT_PARTS.OUTPUT_INSTRUCTIONS_TEMPLATE_FN(
    'REVIEW_CHAPTER_ONLY', 
    targetChapterWordCount, 
    chapterNumber, 
    isFinalChapter
  );
  
  const fullPrompt = `
${goalPrompt}
The novel title is: "${projectTitle}".
Chapter ${chapterNumber} has been generated. The target length for this chapter was ~${targetChapterWordCount} words.
Stated Literary Influences for the novel: "${literaryInfluences || 'None specified'}".
You need to perform a review analysis of this chapter.

The plan for Chapter ${chapterNumber} was:
<chapter_plan_for_chapter_${chapterNumber}>
${chapterPlan}
</chapter_plan_for_chapter_${chapterNumber}>

The generated prose for Chapter ${chapterNumber} is:
<generated_prose_for_chapter_${chapterNumber}>
${generatedProse}
</generated_prose_for_chapter_${chapterNumber}>

${reviewInstructions}
${outputInstructions}
${SYSTEM_PROMPT_PARTS.USER_COMMANDS}

Please perform and verbalize the <chapter_review_analysis> for Chapter ${chapterNumber} as specified.
This includes:
- Depth and plan adherence.
- Title Review & Refinement (suggesting \`SUGGESTED_TITLE:\` if applicable).
- Logging key developments from prose (\`SUGGESTED_CHAPTER_CONTEXT_LOG_UPDATE:\`).
- Stylistic alignment with influences.
- Critical Continuity & Consistency Check.
- AUTO_REVISION_RECOMMENDATION.
${isFinalChapter ? "This is the final chapter review. Do not plan any subsequent chapters." : `This review will inform planning for Chapter ${chapterNumber + 1}, which will be handled in a separate, subsequent step. Do NOT include any planning for Chapter ${chapterNumber + 1} in this output. Your output must ONLY be the review analysis for Chapter ${chapterNumber}.`}
  `;
  const response = await generateWithGemini(modelName, fullPrompt);
  return response.text;
};

export const suggestNovelModifiers = async (
  initialIdeaText: string,
  modelName: string,
  currentUserGenre?: string,
  currentUserSubGenre?: string,
  sourceDataContent?: string
): Promise<IdeaSparkSuggestions> => {
  const prompt = SYSTEM_PROMPT_PARTS.SYSTEM_PROMPT_IDEA_SPARK_FN(initialIdeaText, currentUserGenre, currentUserSubGenre, sourceDataContent);
  const response = await generateWithGemini(modelName, prompt, true); 

  let jsonStr = response.text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }

  try {
    const parsedData = JSON.parse(jsonStr);
    return parsedData as IdeaSparkSuggestions;
  } catch (e) {
    console.error("Failed to parse JSON response from Idea Spark:", e, "Raw text:", response.text);
    throw new Error("AI returned an invalid JSON format for Idea Spark suggestions. Please try again or rephrase your initial idea.");
  }
};


const MIN_SUBSTANTIAL_LENGTH = 100; 

export const parseInitialPlanOutput = (fullOutput: string): Partial<InitialAISetupPlan> => {
    const plan: Partial<InitialAISetupPlan> = {
        chapterOutlines: [],
    };

    // Attempt to find where Phase 1 verbalization starts, after potential Title/Logline/Synopsis
    let phaseVerbalizationStartIndex = fullOutput.search(/Initiating Creative Planning Phase 1: Concept & Premise|Phase 1: Concept & Premise Development \(Verbalize\)/i);
    if (phaseVerbalizationStartIndex === -1) {
        phaseVerbalizationStartIndex = 0; // Fallback to start of string if marker not found
    }
    const phaseContent = fullOutput.substring(phaseVerbalizationStartIndex);
    
    const conceptMatch = phaseContent.match(/Phase 1: Concept & Premise Development \(Verbalize\)([\s\S]*?)(Phase 2: Character & Setting Development \(Verbalize\)|<planning_rules>|<output>|$)/ms);
    if (conceptMatch && conceptMatch[1] && conceptMatch[1].trim().length > MIN_SUBSTANTIAL_LENGTH) {
        plan.conceptAndPremise = conceptMatch[1].trim();
    }

    const charSettingMatch = phaseContent.match(/Phase 2: Character & Setting Development \(Verbalize\)([\s\S]*?)(Phase 3: Overall Plot Outline & Chapter Structure \(Verbalize\)|<planning_rules>|<output>|$)/ms);
    if (charSettingMatch && charSettingMatch[1] && charSettingMatch[1].trim().length > MIN_SUBSTANTIAL_LENGTH) {
        plan.charactersAndSetting = charSettingMatch[1].trim();
    }

    const plotOutlineMatch = phaseContent.match(/Phase 3: Overall Plot Outline & Chapter Structure \(Verbalize\)([\s\S]*?)(?:Initiating Hyper-Detailed Planning for Chapter 1|<planning_rules>|<output>|$)/ms);
    if (plotOutlineMatch && plotOutlineMatch[1] && plotOutlineMatch[1].trim().length > MIN_SUBSTANTIAL_LENGTH) {
        plan.overallPlotOutline = plotOutlineMatch[1].trim();
        
        const chapterOutlinesText = plan.overallPlotOutline; 
        const outlineRegex = /ChapterOutline\s*(\d+):\s*\n\s*workingTitle:(.*?)\n\s*briefSynopsis:(.*?)\n\s*keyContinuityPoints:\s*([\s\S]*?)(?=\n\s*ChapterOutline|\n\s*Action 3\.3|\n\s*Checklist 3|$)/gim;
        let outlineMatchResult; // Renamed to avoid conflict with outer scope 'match'
        while ((outlineMatchResult = outlineRegex.exec(chapterOutlinesText)) !== null) {
            const keyPointsText = outlineMatchResult[4].trim();
            const keyContinuityPoints = keyPointsText.split(/\n\s*-\s*/).map(p => p.trim()).filter(p => p);
            
            plan.chapterOutlines!.push({
                chapterNumber: parseInt(outlineMatchResult[1], 10),
                workingTitle: outlineMatchResult[2].trim(),
                briefSynopsis: outlineMatchResult[3].trim(),
                keyContinuityPoints: keyContinuityPoints,
            });
        }
        
        const contextLogRegexPrimary = /evolvingStoryContextLog:\s*([\s\S]*?)(?:\n\s*Checklist 3|<output>|$)/im;
        const contextLogMatchPrimary = plan.overallPlotOutline.match(contextLogRegexPrimary);
        if (contextLogMatchPrimary && contextLogMatchPrimary[1]) {
            plan.inProcessAmendments = contextLogMatchPrimary[1].trim();
        }
    }
    
    // Fallback: If context log wasn't found in the plot outline block, search the whole verbalization.
    if (!plan.inProcessAmendments) {
        const contextLogRegexFallback = /evolvingStoryContextLog:\s*([\s\S]*?)(?:\n\s*Checklist 3|<output>|$)/im;
        const contextLogMatchFallback = phaseContent.match(contextLogRegexFallback);
        if (contextLogMatchFallback && contextLogMatchFallback[1]) {
            plan.inProcessAmendments = contextLogMatchFallback[1].trim();
        }
    }


    // Fallback parsing for logline and synopsis if they are labeled within phases (less likely with new prompt structure)
    const extractLabeledLogline = (text: string | undefined): string | undefined => {
        if (!text) return undefined;
        const loglineRegex = /Action 1\.5:.*?Logline:\s*([\s\S]*?)(?:\n\n|\n\* Checklist|\nAction 1\.6|\nPhase|\nAction|$)/i;
        const matchResult = text.match(loglineRegex);
        return matchResult && matchResult[1] ? matchResult[1].trim() : undefined;
    };

    const extractLabeledSynopsis = (text: string | undefined): string | undefined => {
      if (!text) return undefined;
      // Look for Synopsis: specifically after an Action item that might draft it
      const synopsisRegex = /Action \d\.\d+:\s*.*?Synopsis:\s*([\s\S]*?)(?:\n\n|\n\* Checklist|\nAction|\nPhase|$)/im;
      const matchResult = text.match(synopsisRegex);
      return matchResult && matchResult[1] ? matchResult[1].trim() : undefined;
    };
    
    if (!plan.logLine) plan.logLine = extractLabeledLogline(plan.conceptAndPremise);
    if (!plan.synopsis) plan.synopsis = extractLabeledSynopsis(plan.conceptAndPremise); // Or wherever synopsis drafting action is
    
    plan.conceptAndPremise = plan.conceptAndPremise || "";
    plan.charactersAndSetting = plan.charactersAndSetting || "";
    plan.overallPlotOutline = plan.overallPlotOutline || "";
    plan.inProcessAmendments = plan.inProcessAmendments || "Novel Context Log not initialized by AI.";

    return plan;
};

export interface ParsedChapterPlan {
    planText: string;
    workingTitle?: string;
    planContextNotes?: string; 
}

export const parseChapterPlanOutput = (fullOutput: string): ParsedChapterPlan => {
    let planText = "";
    let workingTitle: string | undefined;
    let planContextNotes: string | undefined;

    const planMatch = fullOutput.match(/Initiating Hyper-Detailed Planning for Chapter[\s\S]*?(?:Final Readiness Check for Generating Chapter[\s\S]*?Checklist 5 \(Verbalize completion\)[\s\S]*?\[\s*x?\s*\] Readiness to generate confirmed\.|<\/planning_rules>|<output>|$)/msi);
    
    if (planMatch && planMatch[0]) {
        let matchedText = planMatch[0].trim();
        
        const titleRegex = /Propose a concise \`workingTitle\` for Chapter \d+.*?(?:\n\s*Working Title:\s*|\n\s*workingTitle:\s*|\n\s*Proposed workingTitle:\s*|\n\s*Title:\s*)?"?(.*?)"?(?:\s*\n|\s*This should align)/im;
        const titleFound = matchedText.match(titleRegex);
        if (titleFound && titleFound[1]) {
            workingTitle = titleFound[1].trim().replace(/^["']|["']$/g, ''); 
        }

        const contextNotesRegex = /KEY_CHAPTER_DEVELOPMENTS_FROM_PLAN:\s*([\s\S]*?)(?:\n\s*Checklist 4|\n\s*Phase 5|$)/im;
        const contextNotesFound = matchedText.match(contextNotesRegex);
        const noNewContextPhrases = [
            "plan primarily executes existing threads; no major new context points to log from this plan.",
            "none from this chapter's plan." // Older phrase, for robustness
        ];
        if (contextNotesFound && contextNotesFound[1]) {
            const notes = contextNotesFound[1].trim();
            if (!noNewContextPhrases.some(phrase => notes.toLowerCase().includes(phrase.toLowerCase())) && notes.length > 5) { // Arbitrary short length check
                planContextNotes = notes;
            }
        }
        
        matchedText = matchedText.replace(/\[\s*x?\s*\] Prohibited information check passed.\s*$/gmi, "").trim();
        matchedText = matchedText.replace(/<\/planning_rules>\s*$/i, "").trim();
        matchedText = matchedText.replace(/<output>\s*$/i, "").trim();
        matchedText = matchedText.replace(/Final Readiness Check for Generating Chapter[\s\S]*?Checklist 5 \(Verbalize completion\)[\s\S]*?\[\s*x?\s*\] Readiness to generate confirmed\./gmi, '').trim();


        if (matchedText.length > MIN_SUBSTANTIAL_LENGTH) {
             planText = matchedText;
        }
    }

    if (!planText && fullOutput.trim().length > MIN_SUBSTANTIAL_LENGTH) {
        console.warn("Chapter plan parsing (primary) failed, using fallback. Full output:", fullOutput);
        planText = fullOutput.trim();
        if (!workingTitle) {
             const fallbackTitleMatch = planText.match(/workingTitle:\s*(.*?)\n/i);
             if (fallbackTitleMatch && fallbackTitleMatch[1]) workingTitle = fallbackTitleMatch[1].trim().replace(/^["']|["']$/g, '');
        }
    }
    
    return { planText, workingTitle, planContextNotes };
};


export const parseChapterProseOutput = (fullOutput: string): { title?: string, prose: string } => {
    const novelHeaderSkipRegex = /^(?:#\s*.*?\n(?:Logline(?:.|\n)*?Synopsis:(?:.|\n)*?)?)?(## Chapter.*)/s;
    let contentToParse = fullOutput;
    const skipMatch = fullOutput.match(novelHeaderSkipRegex);
    if (skipMatch && skipMatch[1]) {
        contentToParse = skipMatch[1];
    }

    const chapterRegex = /^## Chapter \d+:(?:\s*(.*?))?\n([\s\S]+)/m;
    const match = contentToParse.match(chapterRegex);

    if (match) {
        const title = match[1] ? match[1].trim() : undefined;
        let prose = match[2] ? match[2].trim() : "";

        const reviewAndPlanningMarkers = /<chapter_review_analysis>|Initiating Review Analysis for completed Chapter|AUTO_REVISION_RECOMMENDED:|Phase 4: Hyper-Detailed Blueprint for Chapter|Phase 1: Concept & Premise Development/i;
        const reviewMarkerPos = prose.search(reviewAndPlanningMarkers);
        
        if (reviewMarkerPos !== -1) {
            prose = prose.substring(0, reviewMarkerPos).trim();
        }

        const hasPlanningLeakage = /<planning_rules>|<output>|Checklist \d/i.test(prose); 

        if (prose.length > MIN_SUBSTANTIAL_LENGTH && !hasPlanningLeakage) {
            return { title: title || undefined, prose };
        } else {
            console.warn("Prose parsing: Substantial length or no leakage check failed.", { title, proseLength: prose.length, hasPlanningLeakage });
        }
    }
    
    const chapterNoTitleRegex = /^## Chapter \d+\s*\n([\s\S]+)/m;
    const noTitleMatch = contentToParse.match(chapterNoTitleRegex);
    if (noTitleMatch) {
        let prose = noTitleMatch[1] ? noTitleMatch[1].trim() : "";
        const reviewAndPlanningMarkers = /<chapter_review_analysis>|Initiating Review Analysis for completed Chapter|AUTO_REVISION_RECOMMENDED:|Phase 4: Hyper-Detailed Blueprint for Chapter|Phase 1: Concept & Premise Development/i;
        const reviewMarkerPos = prose.search(reviewAndPlanningMarkers);
        if (reviewMarkerPos !== -1) {
            prose = prose.substring(0, reviewMarkerPos).trim();
        }
        const hasPlanningLeakage = /<planning_rules>|<output>|Checklist \d/i.test(prose);
        if (prose.length > MIN_SUBSTANTIAL_LENGTH && !hasPlanningLeakage) {
            return { prose };
        } else {
             console.warn("Prose parsing (no title fallback): Substantial length or no leakage check failed.", {proseLength: prose.length, hasPlanningLeakage});
        }
    }

    let cleanedFullOutput = contentToParse.replace(/^#.*?\n(\n)?(Logline:.*?\n(\n)?)?(Synopsis:.*?\n(\n)?)?/, "").trim(); 
    const reviewAndPlanningMarkers = /<chapter_review_analysis>|Initiating Review Analysis for completed Chapter|AUTO_REVISION_RECOMMENDED:|Phase 4: Hyper-Detailed Blueprint for Chapter|Phase 1: Concept & Premise Development/i;
    const reviewMarkerPosUltimate = cleanedFullOutput.search(reviewAndPlanningMarkers);
    if (reviewMarkerPosUltimate !== -1) {
        cleanedFullOutput = cleanedFullOutput.substring(0, reviewMarkerPosUltimate).trim();
    }
    const hasPlanningLeakageFull = /<planning_rules>|<output>|Checklist \d/i.test(cleanedFullOutput);

    if (cleanedFullOutput.length > MIN_SUBSTANTIAL_LENGTH && !hasPlanningLeakageFull && !/^## Chapter/m.test(cleanedFullOutput)) {
        console.warn("Chapter prose parsing using ultimate fallback. Full output:", fullOutput, "Cleaned Output:", cleanedFullOutput);
        return { prose: cleanedFullOutput };
    }

    console.warn("Chapter prose parsing resulted in empty or unsuitable text. Full output:", fullOutput);
    return { prose: "" };
};


export interface ParsedChapterReview {
  reviewText: string;
  autoRevisionRecommended?: boolean;
  autoRevisionReasons?: string;
  suggestedTitle?: string;
  reviewContextNotes?: string; // Renamed from suggestedInProcessAmendmentsUpdate
}

export const parseChapterReviewOutput = (fullOutput: string): ParsedChapterReview => {
    let reviewTextContent = "";
    let autoRevisionRecommended: boolean | undefined = undefined;
    let autoRevisionReasons: string | undefined = undefined;
    let suggestedTitle: string | undefined = undefined;
    let reviewContextNotes: string | undefined = undefined;

    const fullOutputTrimmed = fullOutput.trim();

    const titleRegex = /SUGGESTED_TITLE:\s*(.*?)(?:\n|$)/im;
    const titleMatch = fullOutputTrimmed.match(titleRegex);
    if (titleMatch && titleMatch[1]) {
        let potentialTitle = titleMatch[1].trim();
        potentialTitle = potentialTitle.replace(/^[`'"“「]+|[`'"”」]+$/g, '').trim();
        if ((potentialTitle.startsWith('`') && potentialTitle.endsWith('`')) ||
            (potentialTitle.startsWith('"') && potentialTitle.endsWith('"')) ||
            (potentialTitle.startsWith("'") && potentialTitle.endsWith("'"))) {
            potentialTitle = potentialTitle.substring(1, potentialTitle.length - 1).trim();
        }
        const lowerPotentialTitle = potentialTitle.toLowerCase();
        const noChangePhrases = [
            "current title is appropriate", "no change needed", "existing title is suitable",
            "title is suitable", "title is appropriate", "keep current title", "no title suggestion",
        ];
        if (!noChangePhrases.some(phrase => lowerPotentialTitle.includes(phrase)) && potentialTitle.length > 0 && potentialTitle.length < 150) { 
            suggestedTitle = potentialTitle;
        }
    }

    const contextNotesRegex = /SUGGESTED_CHAPTER_CONTEXT_LOG_UPDATE:\s*([\s\S]*?)(?:\n2\.7\.\s*Stylistic Alignment|\nCritical Continuity & Consistency Check|\n5\. Automated Revision Recommendation|$)/im;
    const contextNotesMatch = fullOutputTrimmed.match(contextNotesRegex);
    const noNewContextPhrasesReview = [
        "prose aligned with plan; context updates primarily logged during planning phase.",
        "none." // Older phrase
    ];
    if (contextNotesMatch && contextNotesMatch[1]) {
        const notes = contextNotesMatch[1].trim();
        if (!noNewContextPhrasesReview.some(phrase => notes.toLowerCase().includes(phrase.toLowerCase())) && notes.length > 5) {
            reviewContextNotes = notes;
        }
    }
    
    const autoRevisionRegex = /AUTO_REVISION_RECOMMENDED:\s*(YES|NO)\.?\s*([\s\S]*?)(?=(?:\n\d+\.\s*Verbalize: "Chapter \d+ Review Analysis complete)|$)/im;
    const autoRevisionMatch = fullOutputTrimmed.match(autoRevisionRegex);

    if (autoRevisionMatch) {
        autoRevisionRecommended = autoRevisionMatch[1].toUpperCase() === 'YES';
        if (autoRevisionRecommended && autoRevisionMatch[2]) {
            let reasonsText = autoRevisionMatch[2].trim();
            if (reasonsText.toUpperCase().startsWith("REASONS:")) {
                reasonsText = reasonsText.substring("REASONS:".length).trim();
            }
            autoRevisionReasons = reasonsText.replace(/^- /gm, '').replace(/^\* /gm, '').replace(/\n- /gm, '\n').replace(/\n\* /gm, '\n').trim();
        }
    }
    
    const reviewContentRegex = /^(?:<chapter_review_analysis>\s*)?Initiating Review Analysis for completed Chapter[\s\S]*?(?=\n(?:2\.5\.\s*Title Review & Refinement|5\. Automated Revision Recommendation|<\/chapter_review_analysis>|<output>|Phase 4: Hyper-Detailed Blueprint for Chapter|$))/msi;
    let mainReviewMatch = fullOutputTrimmed.match(reviewContentRegex);
    
    if (mainReviewMatch && mainReviewMatch[0]) {
        let potentialReviewText = mainReviewMatch[0].trim();
        potentialReviewText = potentialReviewText.replace(/^<chapter_review_analysis>\s*/i, "").trim();
        potentialReviewText = potentialReviewText.replace(/<\/chapter_review_analysis>\s*$/i, "").trim();
        if(autoRevisionMatch && potentialReviewText.includes(autoRevisionMatch[0])) { 
            potentialReviewText = potentialReviewText.replace(autoRevisionMatch[0], '').trim();
        }
        if(suggestedTitle && titleMatch && potentialReviewText.includes(titleMatch[0])) { 
             potentialReviewText = potentialReviewText.replace(titleMatch[0], '').trim();
        }
        if(contextNotesMatch && potentialReviewText.includes(contextNotesMatch[0])) { 
             potentialReviewText = potentialReviewText.replace(contextNotesMatch[0], '').trim();
        }
         // Strip out the stylistic alignment section as it's metadata, not review text
        const stylisticAlignmentRegex = /\n2\.7\.\s*Stylistic Alignment with Influences[\s\S]*?(?=\n3\. Critical Continuity & Consistency Check|$)/im;
        potentialReviewText = potentialReviewText.replace(stylisticAlignmentRegex, '').trim();


        if (potentialReviewText.length > MIN_SUBSTANTIAL_LENGTH) {
            reviewTextContent = potentialReviewText;
        }
    }

    if (!reviewTextContent && fullOutputTrimmed.length > MIN_SUBSTANTIAL_LENGTH) {
        let cleanedFullOutput = fullOutputTrimmed;
        if (autoRevisionMatch) cleanedFullOutput = cleanedFullOutput.replace(autoRevisionMatch[0], '').trim();
        if (suggestedTitle && titleMatch) cleanedFullOutput = cleanedFullOutput.replace(titleMatch[0], '').trim();
        if (contextNotesMatch) cleanedFullOutput = cleanedFullOutput.replace(contextNotesMatch[0], '').trim();
        
        cleanedFullOutput = cleanedFullOutput.replace(/^<chapter_review_analysis>\s*/i, "").trim();
        cleanedFullOutput = cleanedFullOutput.replace(/<\/chapter_review_analysis>\s*$/i, "").trim();
        cleanedFullOutput = cleanedFullOutput.replace(/\n6\.\s*Verbalize: "Chapter \d+ Review Analysis complete.[\s\S]*/im, "").trim();
        const nextPlanMarker = cleanedFullOutput.search(/Phase 4: Hyper-Detailed Blueprint for Chapter|Phase 1: Concept & Premise Development/i);
        if (nextPlanMarker !== -1) {
            cleanedFullOutput = cleanedFullOutput.substring(0, nextPlanMarker).trim();
        }
        const stylisticAlignmentRegexFallback = /\n2\.7\.\s*Stylistic Alignment with Influences[\s\S]*?(?=\n3\. Critical Continuity & Consistency Check|$)/im;
        cleanedFullOutput = cleanedFullOutput.replace(stylisticAlignmentRegexFallback, '').trim();
        
        if(cleanedFullOutput.length > MIN_SUBSTANTIAL_LENGTH && cleanedFullOutput.includes("Critical Continuity & Consistency Check")) {
            reviewTextContent = cleanedFullOutput;
        } else if (!cleanedFullOutput.includes("Critical Continuity & Consistency Check") && cleanedFullOutput.length > MIN_SUBSTANTIAL_LENGTH/2) {
            console.warn("Chapter review parsing fallback used, content might be partial. Full output:", fullOutput);
            reviewTextContent = cleanedFullOutput;
        }
    }

    return { reviewText: reviewTextContent, autoRevisionRecommended, autoRevisionReasons, suggestedTitle, reviewContextNotes };
};


export const extractNovelTitleAndSynopsis = (fullOutput: string): {novelTitle?: string, synopsis?: string, logLine?: string } => {
    let novelTitle: string | undefined;
    let synopsis: string | undefined;
    let logLine: string | undefined;

    const titleRegex = /^#\s*(.*?)\s*(\n|$)/m;
    const titleMatch = fullOutput.match(titleRegex);
    if (titleMatch && titleMatch[1]) {
        novelTitle = titleMatch[1].trim();
    }

    const contentAfterTitle = titleMatch && titleMatch[0] ? fullOutput.substring(titleMatch[0].length) : fullOutput;

    const loglineRegex = /^\s*Logline:\s*([\s\S]*?)(?:\n\s*Synopsis:|\n\n|\nPhase 1:|$)/im;
    const loglineMatch = contentAfterTitle.match(loglineRegex);
    if (loglineMatch && loglineMatch[1]) {
        logLine = loglineMatch[1].trim();
    }

    const synopsisRegex = /^\s*Synopsis:\s*([\s\S]*?)(?:\n\n|\nPhase 1:|$)/im;
    // Search for synopsis after logline, or if logline not found, from contentAfterTitle
    const searchAreaForSynopsis = loglineMatch && loglineMatch[0] 
                                  ? contentAfterTitle.substring(loglineMatch[0].length) 
                                  : contentAfterTitle;
    const synopsisMatch = searchAreaForSynopsis.match(synopsisRegex);
    if (synopsisMatch && synopsisMatch[1]) {
        synopsis = synopsisMatch[1].trim();
    }
    
    return { novelTitle, synopsis, logLine };
};
