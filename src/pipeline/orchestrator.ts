import { expandIdea } from '../llm/expand.js';
import { critiqueIdea } from '../llm/critique.js';
import { refineIntoPlan, ProductPlan } from '../llm/refine.js';
import { validateInput } from '../llm/validate.js';

export interface PipelineResult {
  originalIdea: string;
  expandedIdea: string;
  critique: string;
  plan: ProductPlan;
  timestamp: Date;
  isSimpleResponse?: boolean;
  simpleResponse?: string;
}

export async function runPipeline(idea: string, llmCount: number = 3): Promise<PipelineResult> {
  const timestamp = new Date();

  console.log('─'.repeat(60));
  console.log(`Original Idea: "${idea.substring(0, 100)}${idea.length > 100 ? '...' : ''}"`);
  console.log(`LLM Count: ${llmCount}`);
  console.log('─'.repeat(60));
  console.log();

  const apiKey = process.env.OPENROUTER_API_KEY!;

  // Stage 0: Validate input
  const validation = await validateInput(idea, apiKey);

  // If not a valid product idea, return simple response
  if (!validation.isValidProductIdea) {
    console.log('⚠️  Input is not a product idea - returning simple response');
    console.log(`Reasoning: ${validation.reasoning}`);

    return {
      originalIdea: idea,
      expandedIdea: '',
      critique: '',
      plan: {
        problemAndSolution: '',
        targetUser: '',
        coreFeatures: [],
        technicalConsiderations: '',
        risksAndEdgeCases: [],
        openQuestions: [],
        suggestedNextSteps: [],
      },
      timestamp,
      isSimpleResponse: true,
      simpleResponse: validation.response,
    };
  }

  console.log('✅ Input is valid - proceeding with full pipeline');
  console.log(`Reasoning: ${validation.reasoning}`);
  console.log();

  // Stage 1: Expand the idea with DeepSeek
  const expandedIdea = await expandIdea(idea, apiKey);

  // If llmCount is 1, return just the expansion
  if (llmCount === 1) {
    return {
      originalIdea: idea,
      expandedIdea,
      critique: '',
      plan: {
        problemAndSolution: expandedIdea,
        targetUser: '',
        coreFeatures: [],
        technicalConsiderations: '',
        risksAndEdgeCases: [],
        openQuestions: [],
        suggestedNextSteps: [],
      },
      timestamp,
      isSimpleResponse: false,
    };
  }

  // Stage 2: Critique with Llama
  const critique = await critiqueIdea(expandedIdea, apiKey);

  // If llmCount is 2, return expansion + critique
  if (llmCount === 2) {
    return {
      originalIdea: idea,
      expandedIdea,
      critique,
      plan: {
        problemAndSolution: expandedIdea,
        targetUser: '',
        coreFeatures: [],
        technicalConsiderations: critique,
        risksAndEdgeCases: [],
        openQuestions: [],
        suggestedNextSteps: [],
      },
      timestamp,
      isSimpleResponse: false,
    };
  }

  // Stage 3: Refine into structured plan with Llama (full pipeline)
  const plan = await refineIntoPlan(expandedIdea, critique, apiKey);

  return {
    originalIdea: idea,
    expandedIdea,
    critique,
    plan,
    timestamp,
    isSimpleResponse: false,
  };
}
