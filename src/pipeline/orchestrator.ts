import { expandIdea } from '../llm/expand.js';
import { critiqueIdea } from '../llm/critique.js';
import { refineIntoPlan, ProductPlan } from '../llm/refine.js';

export interface PipelineResult {
  originalIdea: string;
  expandedIdea: string;
  critique: string;
  plan: ProductPlan;
  timestamp: Date;
}

export async function runPipeline(idea: string): Promise<PipelineResult> {
  const timestamp = new Date();

  console.log('─'.repeat(60));
  console.log(`Original Idea: "${idea.substring(0, 100)}${idea.length > 100 ? '...' : ''}"`);
  console.log('─'.repeat(60));
  console.log();

  const apiKey = process.env.OPENROUTER_API_KEY!;

  // Stage 1: Expand the idea with DeepSeek
  const expandedIdea = await expandIdea(idea, apiKey);

  // Stage 2: Critique with Llama
  const critique = await critiqueIdea(expandedIdea, apiKey);

  // Stage 3: Refine into structured plan with Claude
  const plan = await refineIntoPlan(expandedIdea, critique, apiKey);

  return {
    originalIdea: idea,
    expandedIdea,
    critique,
    plan,
    timestamp,
  };
}
