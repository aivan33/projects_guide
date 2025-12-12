import { generateText } from 'ai';
import { createOpenRouterClient } from './client.js';

export async function expandIdea(idea: string, apiKey: string): Promise<string> {
  console.log('📝 Stage 1/3: Expanding idea with DeepSeek...');

  const openrouter = createOpenRouterClient(apiKey);

  const prompt = `You are a product thinking partner. A user has shared a rough product idea. Your job is to expand and flesh out this idea by exploring:

1. The core problem being solved
2. Who the target users are
3. What the key features might be
4. How this could be technically implemented
5. What the value proposition is

Here's the idea:
"${idea}"

Provide a detailed expansion of this idea. Think broadly and explore different angles. Be creative but grounded. Write in a clear, structured way.`;

  try {
    const { text } = await generateText({
      model: openrouter('deepseek/deepseek-chat'),
      prompt,
      temperature: 0.8,
    });

    console.log('✅ Expansion complete\n');
    return text;
  } catch (error) {
    throw new Error(`DeepSeek API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
