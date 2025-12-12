import { generateText } from 'ai';
import { createOpenRouterClient } from './client.js';

export interface ValidationResult {
  isValidProductIdea: boolean;
  response: string;
  reasoning?: string;
}

export async function validateInput(userInput: string, apiKey: string): Promise<ValidationResult> {
  console.log('🔍 Stage 0: Validating input...');
  console.log(`Input to validate: "${userInput}"`);

  // First do a simple length/pattern check
  const trimmed = userInput.trim();
  const wordCount = trimmed.split(/\s+/).length;

  // Very simple inputs that are clearly not product ideas
  const simpleTestWords = ['test', 'hello', 'hi', 'hey', 'yes', 'no', 'ok', 'okay'];
  const lowerInput = trimmed.toLowerCase();

  if (wordCount === 1 && simpleTestWords.includes(lowerInput)) {
    console.log('❌ Simple test word detected - returning chatbot response');
    return {
      isValidProductIdea: false,
      response: getSimpleResponse(lowerInput),
      reasoning: `Single word input: "${lowerInput}" - not a product idea`,
    };
  }

  if (wordCount <= 3 && trimmed.length < 20) {
    // Very short inputs are likely not product ideas, ask LLM to be sure
    console.log('⚠️  Short input detected - checking with LLM');
  }

  const prompt = `You must determine if this user input is a real product idea or just casual chat/testing.

INPUT: "${userInput}"

STRICT RULES:
1. If input is 1-3 words AND doesn't describe a product/service → NOT VALID
2. If input is: test, hello, hi, hey, yes, no, greetings → NOT VALID
3. If input asks "what can you do?" or similar → NOT VALID
4. If input describes ANY product, app, tool, service, platform → VALID
5. If input describes a problem that needs a solution → VALID

You MUST respond with ONLY this JSON (no other text):
{"isValid": true, "reasoning": "your reason", "response": "friendly response or 'valid'"}

Example 1 - Input: "test"
{"isValid": false, "reasoning": "Single test word", "response": "Hi! I'm PM Assist. I help turn product ideas into detailed plans. Share a product idea to get started!"}

Example 2 - Input: "a fitness app"
{"isValid": true, "reasoning": "Product concept mentioned", "response": "valid"}

NOW RESPOND FOR: "${userInput}"`;

  const openrouter = createOpenRouterClient(apiKey);

  try {
    const { text } = await generateText({
      model: openrouter('deepseek/deepseek-chat'),
      prompt,
      temperature: 0.1, // Lower temperature for more consistent validation
    });

    console.log('Raw validation response:', text);

    // Try to extract JSON even if there's extra text
    let jsonText = text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Parse JSON response
    const parsed = JSON.parse(jsonText);

    console.log(`Validation result: ${parsed.isValid ? '✅ VALID' : '❌ NOT VALID'}`);
    console.log(`Reasoning: ${parsed.reasoning}`);

    return {
      isValidProductIdea: parsed.isValid === true,
      response: parsed.response || 'valid',
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('Error in validation:', error);
    // On error, assume it's valid to avoid blocking legitimate requests
    return {
      isValidProductIdea: true,
      response: 'valid',
      reasoning: 'Validation error - proceeding with generation',
    };
  }
}

function getSimpleResponse(word: string): string {
  const responses: Record<string, string> = {
    'test': "Hi! I'm PM Assist, your product planning assistant. I help transform product ideas into comprehensive plans. Try describing a product or business idea you'd like to explore!",
    'hello': "Hello! I'm here to help you turn product ideas into detailed plans. What product or business idea would you like to work on?",
    'hi': "Hi there! Ready to help you develop your product ideas. Share an idea and I'll create a comprehensive plan for it!",
    'hey': "Hey! I'm PM Assist. Tell me about a product idea and I'll help you create a detailed plan.",
    'yes': "Great! Share a product idea and I'll help you develop a comprehensive plan for it.",
    'no': "No problem! When you're ready, share a product idea and I'll help you create a plan.",
    'ok': "Ready when you are! Describe a product idea and I'll help turn it into a detailed plan.",
    'okay': "Perfect! Share your product idea and I'll help create a comprehensive plan.",
  };

  return responses[word] || "I'm here to help you turn product ideas into detailed plans. Share an idea to get started!";
}
