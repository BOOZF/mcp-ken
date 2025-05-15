import { Mastra } from "@mastra/core";
import { createGitHubAgent } from "./agents/githubAgent";
import { createDefaultRuntimeContext } from "./mcp";

// Initialize agents with async function
export const initializeMastra = async () => {
  try {
    // Create GitHub agent
    const githubAgent = await createGitHubAgent();

    // Initialize Mastra
    const mastra = new Mastra({
      agents: {
        githubAgent,
      },
    });

    // Return the Mastra instance and the default runtime context
    return {
      mastra,
      githubAgent,
      runtimeContext: createDefaultRuntimeContext(),
    };
  } catch (error) {
    console.error("Error initializing Mastra:", error);
    throw error;
  }
};

// Export default runtime context for reuse
export { createDefaultRuntimeContext } from "./mcp";

// Export types
export type { GitHubRepositoryContext } from "./mcp";
