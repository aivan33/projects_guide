#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir, readFile, writeFile } from 'fs/promises';
import dotenv from 'dotenv';
import { runPipeline } from './pipeline/orchestrator.js';
import { writeMarkdownOutput } from './utils/output.js';
import { expandIdea } from './llm/expand.js';
import {
  generateTechStackOptions,
  generateOpenQuestions,
  generateGuidedFinalPlan,
  TechStackOption
} from './llm/guided.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to generate product plan
app.post('/api/generate', async (req, res) => {
  try {
    const { idea, llmCount = 3 } = req.body;

    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: 'Idea is required' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
    }

    // Run the pipeline with specified LLM count
    const result = await runPipeline(idea, llmCount);

    // Check if it's a simple response
    if (result.isSimpleResponse) {
      return res.json({
        success: true,
        content: result.simpleResponse,
        isSimpleResponse: true,
      });
    }

    // Write output for full product plans
    const outputPath = await writeMarkdownOutput(result);

    if (!outputPath) {
      return res.status(500).json({ error: 'Failed to write output file' });
    }

    const filename = path.basename(outputPath);

    // Read the written file to send its content
    const content = await readFile(outputPath, 'utf-8');

    res.json({
      success: true,
      content,
      filename,
      outputPath,
      isSimpleResponse: false,
    });
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API endpoint to list all output files
app.get('/api/files', async (req, res) => {
  try {
    const outputDir = path.join(__dirname, '../output');
    const files = await readdir(outputDir);

    const markdownFiles = files
      .filter(file => file.endsWith('.md') && file !== '.gitkeep')
      .sort((a, b) => b.localeCompare(a)); // Sort by name (newest first due to timestamp)

    res.json({ files: markdownFiles });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API endpoint to get a specific file content
app.get('/api/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(__dirname, '../output', filename);
    const content = await readFile(filePath, 'utf-8');

    res.json({ content, filename });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(404).json({
      error: 'File not found'
    });
  }
});

// Guided mode: Start session and get tech stack options
app.post('/api/guided/start', async (req, res) => {
  try {
    const { idea } = req.body;

    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: 'Idea is required' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    // Expand the idea first
    const expandedIdea = await expandIdea(idea, apiKey);

    // Generate tech stack options
    const techStacks = await generateTechStackOptions(idea, apiKey);

    res.json({
      success: true,
      expandedIdea,
      techStacks,
    });
  } catch (error) {
    console.error('Error starting guided session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Guided mode: Select tech stack and get questions
app.post('/api/guided/select-stack', async (req, res) => {
  try {
    const { idea, expandedIdea, selectedStack } = req.body;

    if (!idea || !expandedIdea || !selectedStack) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    // Generate open questions
    const questions = await generateOpenQuestions(
      idea,
      expandedIdea,
      selectedStack as TechStackOption,
      apiKey
    );

    res.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Guided mode: Complete session with answers
app.post('/api/guided/complete', async (req, res) => {
  try {
    const { idea, expandedIdea, selectedStack, questionsAndAnswers } = req.body;

    if (!idea || !expandedIdea || !selectedStack || !questionsAndAnswers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    // Generate final plan
    const finalPlan = await generateGuidedFinalPlan(
      idea,
      expandedIdea,
      selectedStack as TechStackOption,
      questionsAndAnswers,
      apiKey
    );

    // Save to file
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `product-plan-${dateStr}-${timeStr}.md`;

    const outputDir = path.join(__dirname, '../output');
    const outputPath = path.join(outputDir, filename);

    await writeFile(outputPath, finalPlan, 'utf-8');

    res.json({
      success: true,
      content: finalPlan,
      filename,
      outputPath,
    });
  } catch (error) {
    console.error('Error completing guided session:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API endpoint to delete a file
app.delete('/api/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Only allow deleting .md files
    if (!filename.endsWith('.md')) {
      return res.status(400).json({ error: 'Can only delete markdown files' });
    }

    const filePath = path.join(__dirname, '../output', filename);

    // Check if file exists
    try {
      await readFile(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    await import('fs/promises').then(fs => fs.unlink(filePath));

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 PM Assist Web UI running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from output directory\n`);
});
