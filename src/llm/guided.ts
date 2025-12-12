import { generateText } from 'ai';
import { createOpenRouterClient } from './client.js';

export interface TechStackOption {
  name: string;
  description: string;
  technologies: string[];
  pros: string[];
  cons: string[];
}

export interface GuidedStep {
  step: 'tech_stack' | 'questions' | 'complete';
  message: string;
  options?: TechStackOption[];
  questions?: string[];
  data?: any;
}

export async function generateTechStackOptions(
  idea: string,
  apiKey: string
): Promise<TechStackOption[]> {
  console.log('🎯 Generating tech stack options...');

  const prompt = `Based on this product idea: "${idea}"

Generate 3-4 different technology stack options that would be suitable for building this product.

For each stack, provide:
- Name (e.g., "Modern Web Stack", "Mobile-First Stack", "Rapid Prototype Stack")
- Brief description (1 sentence)
- Key technologies (4-6 items)
- 2-3 pros
- 2-3 cons

Consider different approaches: web vs mobile, simple vs scalable, rapid prototype vs production-ready, etc.

Respond ONLY with valid JSON array:
[
  {
    "name": "Stack Name",
    "description": "Brief description",
    "technologies": ["Tech1", "Tech2", "Tech3"],
    "pros": ["Pro 1", "Pro 2"],
    "cons": ["Con 1", "Con 2"]
  }
]`;

  const openrouter = createOpenRouterClient(apiKey);

  try {
    const { text } = await generateText({
      model: openrouter('deepseek/deepseek-chat'),
      prompt,
      temperature: 0.7,
    });

    console.log('Raw tech stack response:', text);

    // Extract JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error generating tech stacks:', error);
    throw error;
  }
}

export async function generateOpenQuestions(
  idea: string,
  expandedIdea: string,
  selectedStack: TechStackOption,
  apiKey: string
): Promise<string[]> {
  console.log('❓ Generating open questions...');

  const prompt = `Product Idea: ${idea}

Expanded Context: ${expandedIdea}

Selected Tech Stack: ${selectedStack.name}
Technologies: ${selectedStack.technologies.join(', ')}

Generate 4-6 critical open questions that need to be answered before building this product.
Focus on:
- Business/market questions
- User behavior/needs
- Technical decisions
- Risk mitigation
- Scope/priorities

Respond ONLY with a JSON array of question strings:
["Question 1?", "Question 2?", ...]`;

  const openrouter = createOpenRouterClient(apiKey);

  try {
    const { text } = await generateText({
      model: openrouter('meta-llama/llama-3.3-70b-instruct'),
      prompt,
      temperature: 0.7,
    });

    console.log('Raw questions response:', text);

    // Extract JSON
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

export async function generateGuidedFinalPlan(
  idea: string,
  expandedIdea: string,
  selectedStack: TechStackOption,
  questionsAndAnswers: Array<{ question: string; answer: string }>,
  apiKey: string
): Promise<string> {
  console.log('📝 Generating final guided plan...');

  const qaText = questionsAndAnswers
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const prompt = `Create a comprehensive product plan based on this guided brainstorming session:

ORIGINAL IDEA:
${idea}

EXPANDED CONTEXT:
${expandedIdea}

SELECTED TECH STACK:
${selectedStack.name} - ${selectedStack.description}
Technologies: ${selectedStack.technologies.join(', ')}

QUESTIONS & ANSWERS:
${qaText}

Generate a detailed product plan in markdown format with these sections:

# Product Plan

## Problem & Solution
[Clear problem statement and proposed solution]

## Target User
[Specific user personas based on the answers]

## Core Features (MVP)
[Essential features for first version, prioritized]

## Technical Architecture
[High-level architecture using the selected tech stack]

## Implementation Roadmap
[Break down into phases with specific milestones]

## Risks & Mitigation
[Key risks and how to address them based on Q&A]

## Next Steps
[Immediate actionable steps to start building]

Be specific and actionable based on the user's answers.`;

  const openrouter = createOpenRouterClient(apiKey);

  try {
    const { text } = await generateText({
      model: openrouter('meta-llama/llama-3.3-70b-instruct'),
      prompt,
      temperature: 0.7,
    });

    return text;
  } catch (error) {
    console.error('Error generating final plan:', error);
    throw error;
  }
}
