import { NextRequest, NextResponse } from "next/server";
import {
  initializeMastra,
  createDefaultRuntimeContext,
  GitHubRepositoryContext,
} from "@/mastra";
import { RuntimeContext } from "@mastra/core/di";
// Cache the Mastra initialization to avoid recreating it on every request
let mastraPromise: Promise<{
  githubAgent: any;
  runtimeContext: RuntimeContext<GitHubRepositoryContext>;
}> | null = null;

// This initializes Mastra if not already done
const getMastraComponents = async () => {
  if (!mastraPromise) {
    mastraPromise = initializeMastra()
      .then(({ githubAgent, runtimeContext }) => ({
        githubAgent,
        runtimeContext,
      }))
      .catch((error) => {
        console.error("Error initializing Mastra:", error);
        mastraPromise = null; // Reset so we can try again
        throw error;
      });
  }
  return mastraPromise;
};

// This implements an API route that integrates with GitMCP and LLM models
// using proper tool calling patterns

interface ToolResult {
  name: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, owner, repo } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Invalid query parameter" },
        { status: 400 }
      );
    }

    try {
      // Get Mastra components
      const { githubAgent, runtimeContext } = await getMastraComponents();

      // Update context with repo info if provided
      if (owner && repo) {
        runtimeContext.set("repository-owner", owner);
        runtimeContext.set("repository-name", repo);
      }

      console.log("Processing query with Mastra agent:", query);
      console.log(
        "Repository:",
        `${runtimeContext.get("repository-owner")}/${runtimeContext.get(
          "repository-name"
        )}`
      );
      console.log("Using local Ollama model: llama3.1-resume:custom");

      try {
        // Verify Ollama is running
        const ollamaTest = await fetch("http://localhost:11434/api/version", {
          method: "GET",
        });

        if (!ollamaTest.ok) {
          console.warn(
            "Ollama is not running or not accessible, falling back to simulation"
          );
          return fallbackProcessing(query, owner, repo);
        }

        // Use the agent to generate a response, allowing it to use tools
        const agentResponse = await githubAgent.generate(
          [{ role: "user", content: query }],
          {
            maxSteps: 10,
            runtimeContext,
            timeout: 60000, // 60 second timeout for local model
          }
        );

        console.log("Agent response successful");

        return NextResponse.json({ response: agentResponse.text });
      } catch (error) {
        console.error("Error with Ollama LLM call:", error);
        return fallbackProcessing(query, owner, repo);
      }
    } catch (error) {
      console.error("Error with Mastra agent:", error);

      // Fall back to the previous implementation
      return fallbackProcessing(query, owner, repo);
    }
  } catch (error) {
    console.error("Error processing GitMCP request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

/**
 * Fallback to the original implementation if Mastra agent fails
 */
async function fallbackProcessing(
  query: string,
  owner?: string,
  repo?: string
) {
  try {
    console.log("Falling back to original implementation for query:", query);
    const repoIdentifier =
      owner && repo ? `${owner}/${repo}` : "eddycjy/go-gin-example";
    console.log(`Using repository: ${repoIdentifier}`);

    // Step 1: Call the repository tools to fetch information
    const toolResults = await executeGitHubTools(repoIdentifier, query);

    // Step 2: Process the results with LLM
    const llmResponse = await generateLLMResponse(query, toolResults);

    return NextResponse.json({ response: llmResponse });
  } catch (error) {
    console.error("Error in fallback processing:", error);
    return NextResponse.json(
      { error: "Failed to process request in fallback mode" },
      { status: 500 }
    );
  }
}

/**
 * Execute tools to fetch GitHub repository information
 * This simulates the MCP tool calling pattern where an agent would invoke multiple tools
 */
async function executeGitHubTools(
  repo: string,
  query: string
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  try {
    // Tool 1: Fetch repository metadata
    const repoMetadata = await fetchRepositoryMetadata(repo);
    results.push({
      name: "fetch_repository_metadata",
      content: JSON.stringify(repoMetadata),
    });

    // Tool 2: Fetch README content
    const readmeContent = await fetchRepositoryReadme(repo);
    results.push({
      name: "fetch_repository_readme",
      content: readmeContent,
    });

    // Tool 3: Search repository contents based on query
    const searchResults = await searchRepositoryContents(repo, query);
    results.push({
      name: "search_repository_contents",
      content: JSON.stringify(searchResults),
    });

    // Tool 4: Fetch repository structure
    const repoStructure = await fetchRepositoryStructure(repo);
    results.push({
      name: "fetch_repository_structure",
      content: JSON.stringify(repoStructure),
    });

    return results;
  } catch (error) {
    console.error("Error executing GitHub tools:", error);
    throw error;
  }
}

/**
 * Process the GitHub data with an LLM to generate a response
 * In a production environment, this would use Ollama or another LLM
 */
async function generateLLMResponse(
  query: string,
  toolResults: ToolResult[]
): Promise<string> {
  try {
    // Format the tool results into a prompt for the LLM
    const prompt = formatToolResultsForLLM(query, toolResults);

    try {
      // In a production implementation, this would call Ollama or another LLM API:
      /*
      // Using the OpenAI-compatible API with Ollama
      const response = await fetch("http://localhost:11434/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI assistant that answers questions about GitHub repositories."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
        }),
      });
      
      const data = await response.json();
      return data.choices[0]?.message?.content;
      */

      // For now, use our fallback method
      return await simulateLLMCall(prompt);
    } catch (error) {
      console.error("Error calling LLM:", error);

      // Fall back to our simulated LLM
      return await simulateLLMCall(prompt);
    }
  } catch (error) {
    console.error("Error generating LLM response:", error);
    return "I encountered an error while processing the repository information. Please try again later.";
  }
}

/**
 * Format tool results for LLM consumption
 */
function formatToolResultsForLLM(
  query: string,
  toolResults: ToolResult[]
): string {
  // Create a prompt that structures the tool data for the LLM
  let prompt = `You are an AI assistant that answers questions about GitHub repositories. 
User's question: "${query}"

I've gathered the following information about the GitHub repository:

`;

  // Add each tool result to the prompt
  toolResults.forEach((result) => {
    prompt += `--- ${result.name} ---\n`;

    // Limit content length to prevent excessively large prompts
    const content =
      result.content.length > 2000
        ? result.content.substring(0, 2000) + "... (truncated)"
        : result.content;

    prompt += `${content}\n\n`;
  });

  prompt += `Based on the above information, please answer the user's question accurately. 
Focus only on the information provided and what can be directly inferred from it.
If you don't have enough information, acknowledge that limitation.
Format your response in a clear, helpful way.`;

  return prompt;
}

/**
 * Simulation of an LLM response
 * This would be replaced by a real LLM API call in production
 */
async function simulateLLMCall(prompt: string): Promise<string> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Do some basic analysis of the prompt to generate a responsive answer
  // This is a simplified approach that would be replaced by a real LLM
  const metadataMatch = prompt.match(/"full_name":\s*"([^"]+)"/);
  const repoName = metadataMatch ? metadataMatch[1] : "eddycjy/go-gin-example";

  const starsMatch = prompt.match(/"stargazers_count":\s*(\d+)/);
  const stars = starsMatch ? starsMatch[1] : "many";

  const descriptionMatch = prompt.match(/"description":\s*"([^"]+)"/);
  const description = descriptionMatch
    ? descriptionMatch[1]
    : "a Go Gin example with useful features";

  const query =
    prompt.match(/User's question: "([^"]+)"/)?.[1]?.toLowerCase() || "";

  // Extract some key content from the README
  let readmeSection = "";
  if (prompt.includes("fetch_repository_readme")) {
    const readmeStart =
      prompt.indexOf("fetch_repository_readme") +
      "fetch_repository_readme".length +
      4;
    const readmeEnd = prompt.indexOf("---", readmeStart);
    if (readmeEnd > readmeStart) {
      readmeSection = prompt.substring(readmeStart, readmeEnd).trim();
    }
  }

  // Extract key content based on the query
  let relevantContent = "";

  if (
    query.includes("run") ||
    query.includes("install") ||
    query.includes("setup")
  ) {
    const installationStart = readmeSection.indexOf("## Installation");
    if (installationStart > -1) {
      const nextSectionStart = readmeSection.indexOf(
        "##",
        installationStart + 3
      );
      relevantContent =
        nextSectionStart > -1
          ? readmeSection.substring(installationStart, nextSectionStart)
          : readmeSection.substring(installationStart);
    }

    const runStart = readmeSection.indexOf("## How to run");
    if (runStart > -1) {
      const nextSectionStart = readmeSection.indexOf("##", runStart + 3);
      const runSection =
        nextSectionStart > -1
          ? readmeSection.substring(runStart, nextSectionStart)
          : readmeSection.substring(runStart);
      relevantContent += "\n\n" + runSection;
    }
  } else if (
    query.includes("feature") ||
    query.includes("what") ||
    query.includes("capabilities")
  ) {
    const featuresStart = readmeSection.indexOf("## Features");
    if (featuresStart > -1) {
      const nextSectionStart = readmeSection.indexOf("##", featuresStart + 3);
      relevantContent =
        nextSectionStart > -1
          ? readmeSection.substring(featuresStart, nextSectionStart)
          : readmeSection.substring(featuresStart);
    }
  } else if (query.includes("api") || query.includes("endpoint")) {
    // Look for API or endpoints info in the README
    const apiStart = readmeSection.indexOf("API");
    if (apiStart > -1) {
      const nextSectionStart = readmeSection.indexOf("##", apiStart);
      relevantContent =
        nextSectionStart > -1
          ? readmeSection.substring(apiStart, nextSectionStart)
          : readmeSection.substring(apiStart, apiStart + 500);
    }
  }

  // Build a response that looks like it was written by an LLM
  // In production, this would be the actual LLM response
  let response = "";

  if (relevantContent) {
    response = `Based on the GitHub repository ${repoName}, I found this information:\n\n${relevantContent}\n\nThis repository has ${stars} stars and is described as: "${description}".`;
  } else {
    response = `The repository ${repoName} is a ${description}. It has ${stars} stars on GitHub.\n\nFrom analyzing the repository's structure and README, it appears to be a framework for building web applications using the Gin framework in Go. It demonstrates patterns for REST APIs, authentication, and database operations.\n\nFor more specific information, please ask about particular aspects like installation, features, or API endpoints.`;
  }

  return response;
}

// Tool implementation: Fetch repository metadata
async function fetchRepositoryMetadata(repo: string): Promise<any> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`);

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching repository metadata:", error);
    throw error;
  }
}

// Tool implementation: Fetch repository README
async function fetchRepositoryReadme(repo: string): Promise<string> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/readme`);

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Decode content from base64
    if (data.content) {
      return atob(data.content.replace(/\n/g, ""));
    }

    return "README content not available";
  } catch (error) {
    console.error("Error fetching repository README:", error);
    return "Could not fetch README content due to an error";
  }
}

// Tool implementation: Search repository contents
async function searchRepositoryContents(
  repo: string,
  query: string
): Promise<any[]> {
  try {
    // Extract key terms from the query for search
    const searchTerms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((term) => term.length > 3) // Only use substantive terms
      .slice(0, 3); // Limit to 3 terms for relevance

    // If we have search terms, use them; otherwise, just get the top-level files
    const searchQuery =
      searchTerms.length > 0 ? searchTerms.join("+") : "api+endpoint+feature";

    // Use GitHub's code search API
    const searchUrl = `https://api.github.com/search/code?q=${searchQuery}+repo:${repo}`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      // If search fails (e.g., rate limits), fall back to repository contents
      const fallbackResponse = await fetch(
        `https://api.github.com/repos/${repo}/contents`
      );

      if (!fallbackResponse.ok) {
        return [];
      }

      return await fallbackResponse.json();
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error searching repository contents:", error);
    return [];
  }
}

// Tool implementation: Fetch repository structure
async function fetchRepositoryStructure(repo: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/contents`
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching repository structure:", error);
    return [];
  }
}
