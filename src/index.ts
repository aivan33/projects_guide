#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { runPipeline } from './pipeline/orchestrator.js';
import { writeMarkdownOutput } from './utils/output.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('pm-assist')
  .description('Product Assistant - Transform rough ideas into comprehensive product plans')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a product plan from your idea')
  .argument('<idea>', 'Your rough product idea (can be a paragraph or a few sentences)')
  .option('-o, --output <filename>', 'Output filename (default: auto-generated)', '')
  .action(async (idea: string, options: { output: string }) => {
    console.log('\n🚀 Product Assistant - Starting pipeline...\n');

    try {
      // Validate API key
      if (!process.env.OPENROUTER_API_KEY) {
        console.error('❌ Error: Missing OPENROUTER_API_KEY in .env file');
        console.error('\nCopy .env.example to .env and add your OpenRouter API key.');
        console.error('Get your free API key at: https://openrouter.ai/keys\n');
        process.exit(1);
      }

      // Run the pipeline
      const result = await runPipeline(idea);

      // Check if it's a simple response
      if (result.isSimpleResponse) {
        console.log('\n💬 Response:');
        console.log(result.simpleResponse);
        console.log();
        return;
      }

      // Write output
      const outputPath = await writeMarkdownOutput(result, options.output);

      if (!outputPath) {
        console.error('\n❌ Error: Failed to write output file\n');
        process.exit(1);
      }

      console.log('\n✅ Product plan generated successfully!');
      console.log(`📄 Output saved to: ${outputPath}\n`);

    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('test-api')
  .description('Test your OpenRouter API connection')
  .action(async () => {
    console.log('\n🔍 Testing OpenRouter API connection...\n');

    const hasKey = !!process.env.OPENROUTER_API_KEY;
    const status = hasKey ? '✅' : '❌';

    console.log(`${status} OpenRouter: ${hasKey ? 'API key found' : 'Missing API key'}`);

    if (hasKey) {
      console.log('\n📦 Free models in the pipeline:');
      console.log('   - DeepSeek (expansion)');
      console.log('   - Llama 3.3 70B (critique & refinement)');
    } else {
      console.log('\n💡 Get your free API key at: https://openrouter.ai/keys');
    }

    console.log();
  });

program.parse();
