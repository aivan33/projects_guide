import fs from 'fs/promises';
import path from 'path';
import { PipelineResult } from '../pipeline/orchestrator.js';

export async function writeMarkdownOutput(
  result: PipelineResult,
  customFilename?: string
): Promise<string | null> {
  // If it's a simple response, don't write a file
  if (result.isSimpleResponse) {
    return null;
  }

  const { plan, timestamp } = result;

  // Generate filename
  const dateStr = timestamp.toISOString().split('T')[0];
  const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = customFilename || `product-plan-${dateStr}-${timeStr}.md`;

  const outputDir = path.join(process.cwd(), 'output');
  const outputPath = path.join(outputDir, filename);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Build markdown content
  const markdown = `# Product Plan

> Generated on ${timestamp.toLocaleString()}

## Problem & Solution

${plan.problemAndSolution}

## Target User

${plan.targetUser}

## Core Features (MVP)

${plan.coreFeatures.map(feature => `- ${feature}`).join('\n')}

## Technical Considerations

${plan.technicalConsiderations}

## Risks & Edge Cases

${plan.risksAndEdgeCases.map(risk => `- ${risk}`).join('\n')}

## Open Questions

${plan.openQuestions.map(question => `- ${question}`).join('\n')}

## Suggested Next Steps

${plan.suggestedNextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

---

## Appendix: Pipeline Outputs

### Original Idea
${result.originalIdea}

### Expanded Idea (Gemini)
${result.expandedIdea}

### Critique (Groq)
${result.critique}
`;

  // Write to file
  await fs.writeFile(outputPath, markdown, 'utf-8');

  return outputPath;
}
