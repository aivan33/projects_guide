import { generateText } from 'ai';
import { createOpenRouterClient } from './client.js';

export interface ProductPlan {
  problemAndSolution: string;
  targetUser: string;
  coreFeatures: string[];
  technicalConsiderations: string;
  risksAndEdgeCases: string[];
  openQuestions: string[];
  suggestedNextSteps: string[];
}

export async function refineIntoPlan(
  expandedIdea: string,
  critique: string,
  apiKey: string
): Promise<ProductPlan> {
  console.log('✨ Stage 3/3: Refining into structured plan with Llama...');

  const openrouter = createOpenRouterClient(apiKey);

  const prompt = `You are a product strategist. You've been given an expanded product idea and a critique of it. Your job is to synthesize these into a clear, comprehensive product plan.

EXPANDED IDEA:
${expandedIdea}

CRITIQUE:
${critique}

Create a structured product plan with these sections:

1. **Problem & Solution**: Clear statement of the problem and proposed solution
2. **Target User**: Who this is for (be specific)
3. **Core Features (MVP)**: List of essential features for a first version
4. **Technical Considerations**: Key technical approaches, architecture decisions, or technologies
5. **Risks & Edge Cases**: Potential issues or challenges to watch for
6. **Open Questions**: Important questions that need answers before building
7. **Suggested Next Steps**: Concrete actions to move forward

IMPORTANT: You MUST respond with ONLY a valid JSON object. No markdown, no code blocks, just the raw JSON.

Format:
{
  "problemAndSolution": "string",
  "targetUser": "string",
  "coreFeatures": ["string"],
  "technicalConsiderations": "string",
  "risksAndEdgeCases": ["string"],
  "openQuestions": ["string"],
  "suggestedNextSteps": ["string"]
}

Be specific, actionable, and comprehensive. Integrate insights from the critique to strengthen the plan.`;

  try {
    const { text } = await generateText({
      model: openrouter('meta-llama/llama-3.3-70b-instruct'),
      prompt,
      temperature: 0.5,
    });

    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonText = jsonMatch[1] || text;

    const plan: ProductPlan = JSON.parse(jsonText.trim());

    console.log('✅ Refinement complete\n');
    return plan;
  } catch (error) {
    throw new Error(`Llama API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
