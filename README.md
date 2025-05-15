# GitHub MCP Demo

This project demonstrates how to create a Model Context Protocol (MCP) integration with GitHub repositories, specifically accessing and querying the [eddycjy/go-gin-example](https://github.com/eddycjy/go-gin-example) repository using a proper MCP tool pattern.

## Features

- Next.js web application with a clean UI
- Implementation of MCP tool pattern for GitHub data retrieval
- Dynamic LLM-style response generation
- API endpoint for executing MCP tools and processing results

## How It Works

The application implements a Model Context Protocol (MCP) pattern:

1. **MCP Tool Execution**: Calls multiple specialized tools to fetch different aspects of repository data
2. **Tool Result Aggregation**: Combines tool outputs into a comprehensive context
3. **LLM Processing**: Formats the tool results and processes them to generate natural language responses

## MCP Tools Implemented

This demo implements four GitHub repository tools:

1. **fetch_repository_metadata**: Retrieves basic repository information (stars, description, etc.)
2. **fetch_repository_readme**: Gets the README content for installation and feature information
3. **search_repository_contents**: Searches for specific files based on query keywords
4. **fetch_repository_structure**: Gets the repository directory and file structure

The tools are executed in sequence, and their outputs are combined into a comprehensive context for the LLM.

## Technical Implementation

The project demonstrates key concepts for building an MCP server:

1. **Tool Definition**: Each tool has a specific purpose and retrieves a specific type of data
2. **Tool Execution**: Tools are executed based on the query context
3. **Result Processing**: Tool outputs are formatted for LLM consumption
4. **Response Generation**: Simulates LLM response generation based on tool outputs

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd mcp-ken

# Install dependencies
npm install
# or
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

- `src/app/page.tsx` - Home page with link to the GitMCP demo
- `src/app/gitmcp/page.tsx` - GitMCP demo interface with MCP tool visualization
- `src/app/api/gitmcp/route.ts` - API endpoint implementing the MCP tool pattern

## API Endpoints

- **POST /api/gitmcp** - Accepts a query parameter, executes MCP tools, and returns processed results

## Learn More

- [GitHub MCP Integration](https://gitmcp.io/) - Learn about GitMCP
- [GitHub API](https://docs.github.com/en/rest) - GitHub REST API documentation
- [Model Context Protocol](https://docs.anthropic.com/en/docs/agents-and-tools/mcp) - Learn about the Model Context Protocol (MCP)
- [Mastra MCP Server](https://docs.mastra.ai/reference/tools/mcp-server) - Reference for building MCP servers

## License

MIT

## Ollama Integration

This project now features integration with Ollama for local LLM processing. Follow these steps to use Ollama:

1. **Install Ollama**:

   - Download and install from [Ollama's website](https://ollama.ai/download)
   - Ensure it's running on the default port `11434`

2. **Pull the model**:

   - Run the following command to pull the model:

   ```bash
   ollama pull llama3
   ```

3. **Create a custom Ollama model** (optional):

   - Create a custom model based on llama3 using this command:

   ```bash
   ollama create llama3.1-resume:custom -f ./Modelfile
   ```

   - Alternatively, you can use the base `llama3` model by updating the model name in the code

4. **Configure the application**:

   - The application is already set up to use Ollama with the `llama3.1-resume:custom` model
   - If you're using a different model, update the model name in `src/mastra/agents/githubAgent.ts`

5. **Run the application**:
   - Make sure Ollama is running in the background
   - Start the application with `pnpm dev`

If Ollama is not available, the application will automatically fall back to using a simulated response.
