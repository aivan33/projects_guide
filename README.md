# Product Assistant

Transform rough ideas into comprehensive product plans using a multi-LLM pipeline powered by OpenRouter and Vercel AI SDK.

## What it does

Takes a rough product idea (a paragraph or a few sentences) and outputs a structured, comprehensive product plan through a sequential 3-stage LLM chain:

1. **Expand** (DeepSeek) - Fleshes out your rough idea with details and context
2. **Critique** (Llama 3.3 70B) - Challenges assumptions, finds gaps, asks tough questions
3. **Refine** (Llama 3.3 70B) - Synthesizes everything into a structured product plan

All models accessed through a **single OpenRouter API key** - no need for multiple API accounts!

## Output Format

Each generated plan includes:

- **Problem & Solution** - Clear problem statement and proposed solution
- **Target User** - Specific user personas
- **Core Features (MVP)** - Essential features for first version
- **Technical Considerations** - Architecture, technologies, approaches
- **Risks & Edge Cases** - Potential challenges and issues
- **Open Questions** - Important questions to answer before building
- **Suggested Next Steps** - Concrete actions to move forward

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get your OpenRouter API key

Get a free API key from **OpenRouter**: https://openrouter.ai/keys

OpenRouter provides access to DeepSeek, Claude, Llama, and many other models through a single API key.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```
OPENROUTER_API_KEY=your_key_here
```

### 4. Build the project

```bash
npm run build
```

## Usage

### Web UI (Recommended)

Start the web interface:

```bash
npm run web
```

Then open http://localhost:3000 in your browser. The web UI provides:

- Clean chat interface similar to Claude/ChatGPT
- Side menu with collapsible chat history
- View all previously generated product plans
- Easy-to-use interface for submitting ideas

### CLI Usage

#### Generate a product plan

```bash
npm run dev generate "Your product idea here"
```

Example:

```bash
npm run dev generate "A CLI tool that helps developers automatically generate API documentation from their code comments"
```

#### With custom output filename

```bash
npm run dev generate "Your idea" -o my-product-plan.md
```

#### Test API connection

```bash
npm run dev test-api
```

## Project Structure

```
pm_assist/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── server.ts             # Web server entry point
│   ├── llm/
│   │   ├── client.ts         # OpenRouter client setup
│   │   ├── expand.ts         # DeepSeek expansion
│   │   ├── critique.ts       # Llama critique
│   │   └── refine.ts         # Claude refinement
│   ├── pipeline/
│   │   └── orchestrator.ts   # Pipeline orchestration
│   └── utils/
│       └── output.ts         # Markdown output formatter
├── public/                   # Web UI frontend
│   ├── index.html            # Main HTML
│   ├── styles.css            # Styling
│   └── app.js                # Frontend logic
├── output/                   # Generated plans saved here
├── .env                      # Your API key (gitignored)
├── .env.example              # Example environment file
└── package.json
```

## Tech Stack

- **OpenRouter** - Unified API for accessing multiple LLMs
- **Vercel AI SDK** - Provider-agnostic AI framework
- **TypeScript** - Type-safe development
- **Commander** - CLI framework

## How it works

1. You provide a rough idea via the CLI
2. **DeepSeek** expands it into a detailed exploration
3. **Llama 3.3 70B** critiques the expansion, finding gaps and weaknesses
4. **Llama 3.3 70B** synthesizes both into a structured product plan
5. Output is saved as a markdown file in `output/`

All models are **100% free** through OpenRouter and accessed using the Vercel AI SDK for clean, maintainable code.

## Future Possibilities

- Save past ideas to a local database
- "Revisit" mode to iterate on previous plans
- Export to task managers (Linear, Jira, etc.)
- Template customization
- Team collaboration features
- Markdown rendering in web UI
- Edit and regenerate previous plans

## License

MIT
