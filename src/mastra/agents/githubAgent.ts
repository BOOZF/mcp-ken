import { Agent } from "@mastra/core/agent";
import { mcp, GitHubRepositoryContext } from "../mcp";
import {
  fetchRepositoryMetadata,
  fetchRepositoryReadme,
  searchRepositoryContents,
  fetchFileContent,
} from "../tools/github";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";

// Initialize Ollama with llama3 models
export const ollama = createOpenAI({
  apiKey: "ollama",
  baseURL: "http://localhost:11434/v1",
  compatibility: "compatible",
});

// Define preferred and fallback model names
const PREFERRED_MODEL = "llama3.1-resume:custom";
const FALLBACK_MODEL = "llama3";

// Helper function to get a working model
const getOllamaModel = async (modelName: string) => {
  try {
    // Try to check if the model exists
    const response = await fetch(`http://localhost:11434/api/tags`);
    if (!response.ok) {
      console.warn("Could not verify Ollama models, using preferred model");
      return modelName;
    }

    const data = await response.json();
    const models = data.models || [];
    const modelExists = models.some((m: any) => m.name === modelName);

    if (!modelExists) {
      console.warn(
        `Model ${modelName} not found, falling back to ${FALLBACK_MODEL}`
      );
      return FALLBACK_MODEL;
    }

    return modelName;
  } catch (error) {
    console.warn("Error checking Ollama models:", error);
    return modelName; // Just return the requested model and let it fail later if needed
  }
};

// Function to create a GitHub Agent with dynamic configuration
export const createGitHubAgent = async () => {
  try {
    // Get MCP tools from the git-mcp server
    const mcpTools = await mcp.getTools();

    // Try to get the preferred model or fallback
    const modelName = await getOllamaModel(PREFERRED_MODEL);
    console.log(`Using Ollama model: ${modelName}`);

    // Create and return the agent
    return new Agent({
      name: "GitHubAgent",
      instructions: ({ runtimeContext }) => {
        const owner = runtimeContext.get("repository-owner");
        const repo = runtimeContext.get("repository-name");

        return `You are an AI agent that specializes in answering questions about GitHub repositories, 
particularly the repository ${owner}/${repo}.

You have the following capabilities:
1. Access repository metadata (stars, watchers, issues, etc.)
2. Read README and documentation files
3. Search for relevant files using keywords
4. Access specific file contents
5. Use the GitMCP tools to get detailed documentation when available

Follow these guidelines:
- Always provide accurate, up-to-date information directly from the repository
- Use code examples when appropriate
- Explain complex concepts in clear, concise language
- If you're unsure or don't have enough information, acknowledge this and explain what additional information would be helpful
- Use the tools at your disposal to gather information before responding
- When code snippets are requested, provide complete, runnable code where possible`;
      },
      model: ollama(modelName),
      tools: {
        // Custom GitHub tools
        fetchRepositoryMetadata,
        fetchRepositoryReadme,
        searchRepositoryContents,
        fetchFileContent,

        // MCP tools from git-mcp - these will be dynamically added
        ...mcpTools,
      },
    });
  } catch (error) {
    console.error("Error creating GitHub agent:", error);

    // Fallback to create an agent without MCP tools
    // Use the base llama3 model to maximize chance of success
    return new Agent({
      name: "GitHubAgent (Fallback)",
      instructions:
        "You are an AI agent that specializes in answering questions about GitHub repositories. Due to an error connecting to GitMCP, you'll use built-in tools only.",
      model: ollama(FALLBACK_MODEL),
      tools: {
        fetchRepositoryMetadata,
        fetchRepositoryReadme,
        searchRepositoryContents,
        fetchFileContent,
      },
    });
  }
};

// Create a structured output schema for repository information
export const repositoryInfoSchema = z.object({
  summary: z.string().describe("Brief summary of the repository"),
  mainFeatures: z
    .array(z.string())
    .describe("List of main features or capabilities"),
  installationInstructions: z
    .string()
    .optional()
    .describe("Steps to install or set up the project"),
  apiEndpoints: z
    .array(
      z.object({
        path: z.string().describe("API endpoint path"),
        description: z.string().describe("What the endpoint does"),
        method: z.string().optional().describe("HTTP method (GET, POST, etc.)"),
      })
    )
    .optional()
    .describe("API endpoints if available"),
  technologiesUsed: z
    .array(z.string())
    .optional()
    .describe("Technologies, libraries, or frameworks used"),
});
