import { generateText } from 'ai';
import { createOpenRouterClient } from './client.js';

export async function critiqueIdea(expandedIdea: string, apiKey: string): Promise<string> {
  console.log('🔍 Stage 2/3: Critiquing with Llama...');

  const openrouter = createOpenRouterClient(apiKey);

  const prompt = `You are a critical product analyst. You've been given an expanded product idea. Your job is to:

1. Challenge assumptions and identify gaps
2. Point out potential risks and edge cases
3. Ask tough questions that need answers
4. Identify what's unclear or underspecified
5. Suggest what's missing from the plan

Be constructive but critical. Your goal is to make this idea stronger by finding its weaknesses.

Here's the expanded idea:
${expandedIdea}

Provide a thorough critique with specific concerns, questions, and suggestions for improvement.`;

  try {
    const { text } = await generateText({
      model: openrouter('meta-llama/llama-3.3-70b-instruct'),
      prompt,
      temperature: 0.7,
    });

    console.log('✅ Critique complete\n');
    return text;
  } catch (error) {
    throw new Error(`Llama API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
