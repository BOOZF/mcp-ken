import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { GitHubRepositoryContext } from "../mcp";

// Tool to fetch repository metadata
export const fetchRepositoryMetadata = createTool({
  id: "fetchRepositoryMetadata",
  description:
    "Fetches metadata for a GitHub repository including stars, watchers, and description",
  inputSchema: z.object({
    owner: z
      .string()
      .optional()
      .describe("Repository owner (username or organization)"),
    repo: z.string().optional().describe("Repository name"),
  }),
  execute: async ({ context, runtimeContext }) => {
    const owner = context.owner || runtimeContext.get("repository-owner");
    const repo = context.repo || runtimeContext.get("repository-name");

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching repository metadata:", error);
      return { error: "Failed to fetch repository metadata" };
    }
  },
});

// Tool to fetch repository README
export const fetchRepositoryReadme = createTool({
  id: "fetchRepositoryReadme",
  description: "Fetches the README content of a GitHub repository",
  inputSchema: z.object({
    owner: z
      .string()
      .optional()
      .describe("Repository owner (username or organization)"),
    repo: z.string().optional().describe("Repository name"),
  }),
  execute: async ({ context, runtimeContext }) => {
    const owner = context.owner || runtimeContext.get("repository-owner");
    const repo = context.repo || runtimeContext.get("repository-name");

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();

      // Decode content from base64
      if (data.content) {
        return {
          content: atob(data.content.replace(/\n/g, "")),
          name: data.name,
          path: data.path,
        };
      }

      return { error: "README content not available" };
    } catch (error) {
      console.error("Error fetching repository README:", error);
      return { error: "Failed to fetch README content" };
    }
  },
});

// Tool to search repository contents
export const searchRepositoryContents = createTool({
  id: "searchRepositoryContents",
  description:
    "Searches for relevant files in a GitHub repository based on keywords",
  inputSchema: z.object({
    owner: z
      .string()
      .optional()
      .describe("Repository owner (username or organization)"),
    repo: z.string().optional().describe("Repository name"),
    query: z.string().describe("Search query or keywords"),
  }),
  execute: async ({ context, runtimeContext }) => {
    const owner = context.owner || runtimeContext.get("repository-owner");
    const repo = context.repo || runtimeContext.get("repository-name");
    const query = context.query;

    try {
      // Extract key terms from the query for search
      const searchTerms = query
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((term) => term.length > 3) // Only use substantive terms
        .slice(0, 3); // Limit to 3 terms for relevance

      // If we have search terms, use them; otherwise, use some defaults
      const searchQuery =
        searchTerms.length > 0 ? searchTerms.join("+") : "api+endpoint+feature";

      // Use GitHub's code search API
      const searchUrl = `https://api.github.com/search/code?q=${searchQuery}+repo:${owner}/${repo}`;

      const response = await fetch(searchUrl);

      if (!response.ok) {
        // If search fails (e.g., rate limits), fall back to repository contents
        const fallbackResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents`
        );

        if (!fallbackResponse.ok) {
          return { items: [] };
        }

        return {
          items: await fallbackResponse.json(),
          note: "Fallback to repository contents due to search API limitations",
        };
      }

      const data = await response.json();
      return { items: data.items || [] };
    } catch (error) {
      console.error("Error searching repository contents:", error);
      return { items: [], error: "Failed to search repository contents" };
    }
  },
});

// Tool to fetch specific file content
export const fetchFileContent = createTool({
  id: "fetchFileContent",
  description:
    "Fetches the content of a specific file from a GitHub repository",
  inputSchema: z.object({
    owner: z
      .string()
      .optional()
      .describe("Repository owner (username or organization)"),
    repo: z.string().optional().describe("Repository name"),
    path: z.string().describe("File path in the repository"),
  }),
  execute: async ({ context, runtimeContext }) => {
    const owner = context.owner || runtimeContext.get("repository-owner");
    const repo = context.repo || runtimeContext.get("repository-name");
    const path = context.path;

    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();

      // Decode content from base64
      if (data.content) {
        const content = atob(data.content.replace(/\n/g, ""));
        return {
          content,
          name: data.name,
          path: data.path,
          type: data.type,
          size: data.size,
        };
      }

      return { error: "File content not available" };
    } catch (error) {
      console.error("Error fetching file content:", error);
      return { error: "Failed to fetch file content" };
    }
  },
});
