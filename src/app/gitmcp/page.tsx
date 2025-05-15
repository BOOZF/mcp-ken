"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

// CodeBlock component for displaying code snippets with copy functionality
const CodeBlock = ({
  code,
  language = "typescript",
}: {
  code: string;
  language?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-4 mb-6 rounded-lg overflow-hidden border border-black/[.08] dark:border-white/[.145]">
      <div className="flex justify-between items-center px-4 py-2 bg-black/[.07] dark:bg-white/[.07]">
        <span className="text-xs font-medium">{language}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-black/[.1] dark:bg-white/[.1] hover:bg-black/[.2] dark:hover:bg-white/[.2] transition-colors"
        >
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto bg-black/[.03] dark:bg-black/[.2] text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default function GitMCP() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTools, setShowTools] = useState(false);
  const [repoOwner, setRepoOwner] = useState("eddycjy");
  const [repoName, setRepoName] = useState("go-gin-example");
  const [customRepo, setCustomRepo] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{
    connected: boolean;
    model: string;
  } | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [recentRepos, setRecentRepos] = useState<
    Array<{ owner: string; repo: string }>
  >([]);

  const getSampleQuestions = () => {
    const baseQuestions = [
      `How do I run the ${repoOwner}/${repoName} project?`,
      `What features does ${repoOwner}/${repoName} have?`,
      `What API endpoints are available in ${repoOwner}/${repoName}?`,
      `Tell me about ${repoOwner}/${repoName} project`,
      `Show me a simple Mastra weather agent code`,
    ];
    return baseQuestions;
  };

  const weatherAgentCode = `import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { openai } from '@ai-sdk/openai';
import { z } from "zod";

interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

const getWeather = async (location: string) => {
  const geocodingUrl = \`https://geocoding-api.open-meteo.com/v1/search?name=\${encodeURIComponent(location)}&count=1\`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();

  if (!geocodingData.results?.[0]) {
    throw new Error(\`Location '\${location}' not found\`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = \`https://api.open-meteo.com/v1/forecast?latitude=\${latitude}&longitude=\${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code\`;

  const response = await fetch(weatherUrl);
  const data: WeatherResponse = await response.json();

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: data.current.weather_code,
    location: name,
  };
};

const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({ location: z.string().describe("City name") }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.number(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

const agent = new Agent({
  name: "weather-assistant",
  instructions: "You are a weather assistant that can provide weather information.",
  model: openai("gpt-4o"),
  tools: [weatherTool],
});

// Example usage
const run = async () => {
  const response = await agent.run({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }]
  });
  console.log(response);
};

run();`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setIsLoading(true);
    setResponse("");
    setError("");

    try {
      // Custom handling for weather agent code request
      if (
        query.toLowerCase().includes("weather agent") ||
        query.toLowerCase().includes("mastra weather") ||
        query.toLowerCase().includes("weather with mastra") ||
        query.toLowerCase().includes("show me a simple mastra weather")
      ) {
        setTimeout(() => {
          setResponse(
            `Here is a simple TypeScript agent that gets the current weather for a given location using Mastra.ai and Open-Meteo API:\n\n\`\`\`typescript\n${weatherAgentCode}\n\`\`\`\n\nThis agent uses the Open-Meteo API which doesn't require an API key. It creates a weather tool that can be used to fetch weather data for any location.`
          );
          setIsLoading(false);
        }, 1000);
        return;
      }

      const response = await fetch("/api/gitmcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
          owner: repoOwner,
          repo: repoName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();
      setResponse(data.response);
    } catch (error) {
      console.error("Error fetching response:", error);
      setError(
        "Error processing your request. If you're using Ollama, please ensure it's running on http://localhost:11434 with the llama3.1-resume:custom model available. The system will fall back to a simulated response if Ollama is not available."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleQuestion = (question: string) => {
    setQuery(question);
  };

  const toggleTools = () => {
    setShowTools(!showTools);
  };

  const toggleCustomRepo = () => {
    setCustomRepo(!customRepo);
  };

  const updateRecentRepos = (owner: string, repo: string) => {
    const repoExists = recentRepos.some(
      (r) => r.owner === owner && r.repo === repo
    );

    if (!repoExists) {
      const newRecentRepos = [{ owner, repo }, ...recentRepos];

      const updatedRepos = newRecentRepos.slice(0, 5);

      setRecentRepos(updatedRepos);

      localStorage.setItem("gitmcp-recent-repos", JSON.stringify(updatedRepos));
    } else {
      const filteredRepos = recentRepos.filter(
        (r) => !(r.owner === owner && r.repo === repo)
      );
      const newRecentRepos = [{ owner, repo }, ...filteredRepos];

      setRecentRepos(newRecentRepos);

      localStorage.setItem(
        "gitmcp-recent-repos",
        JSON.stringify(newRecentRepos)
      );
    }
  };

  const handleGithubUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = new URL(githubUrl);

      if (!url.hostname.includes("github.com")) {
        throw new Error("Not a valid GitHub URL");
      }

      const pathParts = url.pathname.split("/").filter(Boolean);

      if (pathParts.length >= 2) {
        const owner = pathParts[0];
        const repo = pathParts[1];

        setRepoOwner(owner);
        setRepoName(repo);
        setGithubUrl("");
        setError("");

        updateRecentRepos(owner, repo);

        setResponse(
          `Repository changed to ${owner}/${repo}. Ask a question about this repository!`
        );
      } else {
        throw new Error("Could not extract repository information from URL");
      }
    } catch (error) {
      console.error("Error parsing GitHub URL:", error);
      setError(
        "Please enter a valid GitHub repository URL (e.g., https://github.com/username/repository)"
      );
    }
  };

  const switchToRepo = (owner: string, repo: string) => {
    setRepoOwner(owner);
    setRepoName(repo);
    setResponse(
      `Repository changed to ${owner}/${repo}. Ask a question about this repository!`
    );
  };

  useEffect(() => {
    const checkOllama = async () => {
      try {
        const versionRes = await fetch("http://localhost:11434/api/version");
        if (!versionRes.ok) {
          setOllamaStatus({ connected: false, model: "Fallback (Simulation)" });
          return;
        }

        const tagsRes = await fetch("http://localhost:11434/api/tags");
        if (!tagsRes.ok) {
          setOllamaStatus({ connected: true, model: "Unknown" });
          return;
        }

        const data = await tagsRes.json();
        const models = data.models || [];
        const hasCustomModel = models.some(
          (m: any) => m.name === "llama3.1-resume:custom"
        );
        const hasLlama3 = models.some((m: any) => m.name === "llama3");

        if (hasCustomModel) {
          setOllamaStatus({ connected: true, model: "llama3.1-resume:custom" });
        } else if (hasLlama3) {
          setOllamaStatus({ connected: true, model: "llama3 (fallback)" });
        } else {
          setOllamaStatus({
            connected: true,
            model:
              "Available models: " + models.map((m: any) => m.name).join(", "),
          });
        }
      } catch (error) {
        console.error("Error checking Ollama:", error);
        setOllamaStatus({ connected: false, model: "Fallback (Simulation)" });
      }
    };

    checkOllama();
  }, []);

  useEffect(() => {
    const savedRepos = localStorage.getItem("gitmcp-recent-repos");
    if (savedRepos) {
      try {
        const parsedRepos = JSON.parse(savedRepos);
        setRecentRepos(parsedRepos);
      } catch (error) {
        console.error("Error parsing saved repositories:", error);
        setRecentRepos([{ owner: "eddycjy", repo: "go-gin-example" }]);
      }
    } else {
      setRecentRepos([{ owner: "eddycjy", repo: "go-gin-example" }]);
    }
  }, []);

  return (
    <div className="min-h-screen p-8 flex flex-col">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/github-mark.svg"
            alt="GitHub Logo"
            width={40}
            height={40}
            className="dark:invert"
          />
          <h1 className="text-2xl font-bold">GitHub MCP</h1>
        </div>
        <Link href="/" className="text-sm hover:underline">
          Return Home
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full">
        <div className="bg-black/[.05] dark:bg-white/[.06] p-6 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Repository Information</h2>
          <div className="space-y-2 text-sm">
            {!customRepo ? (
              <>
                <p>
                  <span className="font-medium">Repository:</span> {repoOwner}/
                  {repoName}
                </p>
                <p>
                  <span className="font-medium">Description:</span> An example
                  of gin contains many useful features
                </p>
                <p>
                  <span className="font-medium">Status:</span> Connected via
                  GitMCP (Live GitHub data)
                </p>
                <p>
                  <span className="font-medium">Ollama:</span>{" "}
                  {ollamaStatus ? (
                    <span
                      className={
                        ollamaStatus.connected
                          ? "text-green-600 dark:text-green-400"
                          : "text-yellow-600 dark:text-yellow-400"
                      }
                    >
                      {ollamaStatus.connected ? "Connected" : "Not connected"} -
                      Using {ollamaStatus.model}
                    </span>
                  ) : (
                    <span className="text-gray-500">Checking status...</span>
                  )}
                </p>
                <p>
                  <a
                    href={`https://github.com/${repoOwner}/${repoName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View on GitHub
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </p>
                <button
                  onClick={toggleCustomRepo}
                  className="mt-2 text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                >
                  Use Custom Repository
                </button>
                <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                  <form
                    onSubmit={handleGithubUrlSubmit}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="Paste GitHub URL here (e.g., https://github.com/username/repo)"
                      className="flex-1 p-2 text-xs border rounded dark:bg-black/20 dark:border-white/20"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
                    >
                      Load Repo
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label htmlFor="repoOwner" className="block text-xs mb-1">
                      Owner
                    </label>
                    <input
                      type="text"
                      id="repoOwner"
                      value={repoOwner}
                      onChange={(e) => setRepoOwner(e.target.value)}
                      className="w-full p-2 border rounded text-sm dark:bg-black/20 dark:border-white/20"
                      placeholder="e.g. microsoft"
                    />
                  </div>
                  <div>
                    <label htmlFor="repoName" className="block text-xs mb-1">
                      Repository
                    </label>
                    <input
                      type="text"
                      id="repoName"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      className="w-full p-2 border rounded text-sm dark:bg-black/20 dark:border-white/20"
                      placeholder="e.g. typescript"
                    />
                  </div>
                </div>
                <p className="mb-2">
                  <span className="font-medium">Ollama:</span>{" "}
                  {ollamaStatus ? (
                    <span
                      className={
                        ollamaStatus.connected
                          ? "text-green-600 dark:text-green-400"
                          : "text-yellow-600 dark:text-yellow-400"
                      }
                    >
                      {ollamaStatus.connected ? "Connected" : "Not connected"} -
                      Using {ollamaStatus.model}
                    </span>
                  ) : (
                    <span className="text-gray-500">Checking status...</span>
                  )}
                </p>
                <form
                  onSubmit={handleGithubUrlSubmit}
                  className="flex items-center gap-2 mb-3"
                >
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="Paste GitHub URL here"
                    className="flex-1 p-2 text-xs border rounded dark:bg-black/20 dark:border-white/20"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
                  >
                    Load Repo
                  </button>
                </form>
                <button
                  onClick={toggleCustomRepo}
                  className="text-xs px-3 py-1 rounded-full bg-gray-500/10 hover:bg-gray-500/20"
                >
                  Use Default Repository
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recent repositories */}
        {recentRepos.length > 1 && (
          <div className="bg-black/[.05] dark:bg-white/[.06] p-6 rounded-lg mb-6">
            <h2 className="text-lg font-semibold mb-2">Recent Repositories</h2>
            <div className="flex flex-wrap gap-2">
              {recentRepos.map((repo, index) => (
                <button
                  key={index}
                  onClick={() => switchToRepo(repo.owner, repo.repo)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    repo.owner === repoOwner && repo.repo === repoName
                      ? "bg-blue-500 text-white"
                      : "bg-black/[.05] dark:bg-white/[.06] hover:bg-black/[.1] dark:hover:bg-white/[.1]"
                  }`}
                >
                  {repo.owner}/{repo.repo}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-black/[.05] dark:bg-white/[.06] p-6 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">How It Works</h2>
            <button
              onClick={toggleTools}
              className="text-xs px-3 py-1 rounded-full bg-black/[.1] dark:bg-white/[.1] hover:bg-black/[.2] dark:hover:bg-white/[.2]"
            >
              {showTools ? "Hide Tools" : "Show Tools"}
            </button>
          </div>

          <p className="text-sm mb-3">
            This demo uses a <b>Model Context Protocol (MCP)</b> pattern with
            specific tools using Mastra.ai agent:
          </p>
          <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
            <li>Query is analyzed to determine what information is needed</li>
            <li>MCP tools are called to fetch data from GitHub</li>
            <li>
              Both custom tools and git-mcp tools are used for comprehensive
              data retrieval
            </li>
            <li>
              Results are processed by the LLM to generate a natural response
            </li>
          </ol>

          {showTools && (
            <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
              <h3 className="text-sm font-medium mb-2">MCP Tools Used:</h3>
              <ul className="text-xs space-y-2">
                <li className="p-2 bg-black/[.03] dark:bg-white/[.03] rounded">
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    fetch_repository_metadata
                  </span>
                  <p className="mt-1">
                    Retrieves repository info like stars, description, and basic
                    stats
                  </p>
                </li>
                <li className="p-2 bg-black/[.03] dark:bg-white/[.03] rounded">
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    fetch_repository_readme
                  </span>
                  <p className="mt-1">
                    Fetches the README content with installation, usage, and
                    feature info
                  </p>
                </li>
                <li className="p-2 bg-black/[.03] dark:bg-white/[.03] rounded">
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    search_repository_contents
                  </span>
                  <p className="mt-1">
                    Searches for specific files based on query keywords
                  </p>
                </li>
                <li className="p-2 bg-black/[.03] dark:bg-white/[.03] rounded">
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    fetch_repository_structure
                  </span>
                  <p className="mt-1">
                    Gets the repository directory and file structure
                  </p>
                </li>
              </ul>
            </div>
          )}

          <p className="text-sm mt-3">
            This implementation uses a Mastra.ai agent with local Ollama LLM
            (llama3.1-resume:custom) and connects to git-mcp MCP server for
            enhanced context.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about the repository..."
              className="w-full p-4 pr-12 border border-black/[.08] dark:border-white/[.145] rounded-lg bg-transparent"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-md hover:bg-black/[.05] dark:hover:bg-white/[.06] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black dark:border-white"></div>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>
          </div>
        </form>

        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">
            Try these sample questions:
          </h3>

          <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs">
            Currently querying:{" "}
            <span className="font-mono font-bold">
              {repoOwner}/{repoName}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {getSampleQuestions().map((question, index) => (
              <button
                key={index}
                onClick={() => handleSampleQuestion(question)}
                className="text-xs px-3 py-1.5 rounded-full bg-black/[.05] dark:bg-white/[.06] hover:bg-black/[.1] dark:hover:bg-white/[.1]"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-black dark:border-white"></div>
            <p className="ml-4">
              Executing MCP tools and processing with Ollama LLM...
            </p>
          </div>
        )}

        {response && (
          <div className="whitespace-pre-line border border-black/[.08] dark:border-white/[.145] rounded-lg p-6 bg-black/[.02] dark:bg-white/[.03]">
            {response.includes("```typescript") ? (
              <>
                {response.split("```typescript")[0]}
                <CodeBlock
                  code={response.split("```typescript")[1].split("```")[0]}
                  language="typescript"
                />
                {response.split("```")[2] || ""}
              </>
            ) : (
              response
            )}
          </div>
        )}
      </main>

      <footer className="mt-12 text-center text-xs text-black/60 dark:text-white/60">
        <p>
          This demo implements Model Context Protocol with Mastra.ai agents and
          Ollama local LLM
        </p>
      </footer>
    </div>
  );
}
