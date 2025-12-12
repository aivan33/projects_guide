import { createOpenAI } from '@ai-sdk/openai';

export function createOpenRouterClient(apiKey: string) {
  return createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });
}
