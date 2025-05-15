import { MCPClient } from "@mastra/mcp";
import { RuntimeContext } from "@mastra/core/di";

// Define the type for our repository context
export type GitHubRepositoryContext = {
  "repository-owner": string;
  "repository-name": string;
};

// Configure MCPClient to connect to gitmcp server
export const mcp = new MCPClient({
  servers: {
    // Use generic gitmcp server - this will allow us to work with any repository
    gitmcp: {
      url: new URL("https://gitmcp.io/docs"),
    },
  },
});

// Create a default runtime context with default repository
export const createDefaultRuntimeContext =
  (): RuntimeContext<GitHubRepositoryContext> => {
    const runtimeContext = new RuntimeContext<GitHubRepositoryContext>();
    runtimeContext.set("repository-owner", "eddycjy");
    runtimeContext.set("repository-name", "go-gin-example");
    return runtimeContext;
  };
