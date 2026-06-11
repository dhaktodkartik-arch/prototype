// Srishti AI - Agent Profiles and Configuration Metadata

const PROVIDERS = {
    gemini: {
        name: "Google Gemini",
        color: "#1a73e8",
        glowColor: "#00e5ff",
        defaultModel: "gemini-2.5-flash",
        models: [
            { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Fast & Smart)" },
            { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Deep Reasoning)" },
            { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Legacy)" }
        ],
        placeholderKey: "AIzaSy..."
    },
    openrouter: {
        name: "OpenRouter (Free)",
        color: "#a855f7",
        lowColor: "#c084fc",
        defaultModel: "meta-llama/llama-3-8b-instruct:free",
        models: [
            { id: "meta-llama/llama-3-8b-instruct:free", name: "Meta Llama 3 8B Instruct (Free)" },
            { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Instruct (Free)" },
            { id: "google/gemma-2-9b-it:free", name: "Google Gemma 2 9B (Free)" },
            { id: "microsoft/phi-3-medium-128k-instruct:free", name: "Microsoft Phi 3 Medium (Free)" },
            { id: "openchat/openchat-7b:free", name: "OpenChat 3.5 7B (Free)" }
        ],
        placeholderKey: "sk-or-v1-..."
    },
    openai: {
        name: "OpenAI ChatGPT",
        color: "#10a37f",
        glowColor: "#34d399",
        defaultModel: "gpt-4o-mini",
        models: [
            { id: "gpt-4o-mini", name: "GPT-4o Mini (Fast & Cheap)" },
            { id: "gpt-4o", name: "GPT-4o (High Intelligence)" },
            { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo (Legacy)" }
        ],
        placeholderKey: "sk-..."
    },
    anthropic: {
        name: "Anthropic Claude",
        color: "#d97706",
        glowColor: "#fbbf24",
        defaultModel: "claude-3-5-sonnet",
        models: [
            { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet (State of the Art)" },
            { id: "claude-3-haiku", name: "Claude 3 Haiku (Very Fast)" },
            { id: "claude-3-opus", name: "Claude 3 Opus (Deep Analysis)" }
        ],
        placeholderKey: "sk-ant-..."
    },
    grok: {
        name: "xAI Grok",
        color: "#ffffff",
        glowColor: "#e2e8f0",
        defaultModel: "grok-beta",
        models: [
            { id: "grok-beta", name: "Grok Beta" },
            { id: "grok-2", name: "Grok 2" }
        ],
        placeholderKey: "xai-..."
    },
    perplexity: {
        name: "Perplexity AI",
        color: "#19a3b5",
        glowColor: "#22d3ee",
        defaultModel: "llama-3-sonar-large-32k-online",
        models: [
            { id: "llama-3-sonar-large-32k-online", name: "Sonar Large Online (Search-enabled)" },
            { id: "llama-3-sonar-small-32k-online", name: "Sonar Small Online (Search-enabled)" },
            { id: "mixtral-8x7b-instruct", name: "Mixtral 8x7B Instruct" }
        ],
        placeholderKey: "pplx-..."
    }
};

const DEFAULT_AGENTS = [
    {
        id: "agent-architect",
        name: "Aria",
        role: "Lead Architect",
        provider: "gemini",
        model: "gemini-2.5-flash",
        avatar: "📐",
        prompt: "You are Srishti AI's Lead Architect. Your role is to define high-level system structures, architectural designs, algorithms, schemas, and design patterns. Be structural, logical, and strategic. Outline clear components and workflows.",
        color: "gemini",
        active: true
    },
    {
        id: "agent-critic",
        name: "Zephyr",
        role: "Security Critic",
        provider: "openrouter",
        model: "meta-llama/llama-3-8b-instruct:free",
        avatar: "🛡️",
        prompt: "You are Srishti AI's Security & Performance Critic. Your role is to examine proposed ideas, identify potential bottlenecks, find security flaws (e.g. SQL injection, CORS, XSS, rate-limiting issues), and highlight performance pitfalls. Be constructively critical and suggest alternative solutions.",
        color: "openrouter",
        active: true
    },
    {
        id: "agent-search",
        name: "Nova",
        role: "Web Search Analyst",
        provider: "perplexity",
        model: "llama-3-sonar-large-32k-online",
        avatar: "🔍",
        prompt: "You are Srishti AI's Web Search Analyst. Your role is to verify facts, mention real-world APIs, recommend modern libraries, frameworks, or standards (e.g. React 19, OAuth 2.0, ESM), and provide search-grounded evidence. Focus on accuracy and cite your source types when relevant.",
        color: "perplexity",
        active: true
    },
    {
        id: "agent-engineer",
        name: "Apex",
        role: "Pragmatic Engineer",
        provider: "openai",
        model: "gpt-4o-mini",
        avatar: "⚙️",
        prompt: "You are Srishti AI's Pragmatic Engineer. Your role is to write clean, modular, production-ready code snippets. Focus on code details, error handling, syntax accuracy, and edge cases. Keep implementation straightforward, avoiding over-engineering.",
        color: "openai",
        active: true
    },
    {
        id: "agent-synthesizer",
        name: "Srishti Synthesis",
        role: "Synthesizer Core",
        provider: "gemini",
        model: "gemini-2.5-flash",
        avatar: "🔮",
        prompt: "You are Srishti AI's Synthesis Core. Your task is to review the user's request, examine all brainstorms, critiques, and details provided by other agents. Resolve conflicting opinions, integrate the best ideas, write the comprehensive code, and present a single, final, authoritative, and beautiful solution formatted in clean markdown.",
        color: "gemini",
        active: true,
        isSynthesizer: true // Special hidden agent used in final phase
    }
];

// Export modules if running in Node, otherwise let browser access them globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PROVIDERS, DEFAULT_AGENTS };
}
