/**
 * @module agents/llm-adapter
 * @description LLM Adapter Agent — bridges SURGE with any OpenAI-compatible API.
 *
 * Supports: OpenAI, Mistral, Ollama, Groq, Together AI, LM Studio,
 * llama.cpp, vLLM, or any OpenAI-compatible endpoint.
 * Auto-detects local servers (Ollama, LM Studio, etc.).
 *
 * Features:
 *   - Generic API support — any OpenAI-compatible endpoint works out of the box
 *   - Local LLM support — auto-detects localhost/127.0.0.1 endpoints (no API key needed)
 *   - Rate limiting (configurable minimum interval)
 *   - Timeout with AbortController
 *   - Token tracking
 *   - Failure counting + stats
 *   - Graceful fallback on error (returns null)
 *
 * @example
 *   // Cloud (Mistral, OpenAI, Groq, etc.):
 *   const llm = new LLMAdapter({ endpoint: 'https://api.mistral.ai/v1', apiKey: 'sk-...', model: 'mistral-small-latest' });
 *   // Local (Ollama, LM Studio, llama.cpp, vLLM):
 *   const llm = new LLMAdapter({ endpoint: 'http://localhost:11434', model: 'llama3' });
 *   const result = await llm.query(systemPrompt, userMessage);
 *   if (result) console.log(result.response);
 */

import { DIRECTOR } from '../config/balance.js';

// ─── Configuration Defaults ──────────────────────────────────

const DEFAULTS = {
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  timeout: DIRECTOR.LLM_TIMEOUT_MS || 8000,
  rateLimitMs: DIRECTOR.LLM_RATE_LIMIT_MS || 10000,
  maxOutputTokens: DIRECTOR.LLM_MAX_OUTPUT_TOKENS || 300,
};

// ─── LLMAdapter Class ────────────────────────────────────────

export class LLMAdapter {
  /**
   * @param {object} config
   * @param {string} [config.endpoint]
   * @param {string} [config.apiKey]
   * @param {string} [config.model]
   * @param {number} [config.timeout]
   * @param {number} [config.rateLimitMs]
   */
  constructor(config = {}) {
    this.endpoint = (config.endpoint || DEFAULTS.endpoint).replace(/\/+$/, '');
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULTS.model;
    this.timeout = config.timeout || DEFAULTS.timeout;
    this.rateLimitMs = config.rateLimitMs || DEFAULTS.rateLimitMs;
    this.maxOutputTokens = config.maxOutputTokens || DEFAULTS.maxOutputTokens;

    // Stats
    this._totalCalls = 0;
    this._totalTokens = 0;
    this._totalLatency = 0;
    this._failures = 0;
    this._lastCallTime = 0;
  }

  /**
   * Check if the adapter is configured with at minimum an endpoint.
   * Local LLMs (Ollama, LM Studio, llama.cpp, vLLM) don't need an API key.
   * Cloud APIs (OpenAI, Mistral, Groq, Together) require one.
   * @returns {boolean}
   */
  isConfigured() {
    if (!this.endpoint) return false;
    if (this._isLocal()) return true;
    return !!this.apiKey;
  }

  /**
   * Query the LLM.
   * @param {string} systemPrompt
   * @param {string} userMessage
   * @returns {Promise<{response: string, tokensUsed: number, latency: number}|null>}
   */
  async query(systemPrompt, userMessage) {
    if (!this.isConfigured()) return null;

    // Rate limiting
    const now = Date.now();
    if (now - this._lastCallTime < this.rateLimitMs) {
      console.warn('[LLM] Rate limited — skipping query');
      return null;
    }
    this._lastCallTime = now;

    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const body = this._buildRequestBody(systemPrompt, userMessage);
      const url = this._getUrl();
      const headers = this._getHeaders();

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error(`[LLM] API error ${res.status}: ${errText}`);
        this._failures++;
        return null;
      }

      const data = await res.json();
      const latency = performance.now() - start;
      const result = this._parseResponse(data);

      this._totalCalls++;
      this._totalTokens += result.tokensUsed;
      this._totalLatency += latency;

      return { ...result, latency };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn('[LLM] Query timed out');
      } else {
        console.error('[LLM] Query failed:', err.message);
      }
      this._failures++;
      return null;
    }
  }

  /**
   * Test the connection with a minimal prompt.
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    const oldRateLimit = this.rateLimitMs;
    this.rateLimitMs = 0; // bypass for test
    const result = await this.query(
      'You are a test assistant.',
      'Reply with exactly: OK'
    );
    this.rateLimitMs = oldRateLimit;
    return result !== null;
  }

  /**
   * Fetch available models from the API.
   * Supports: OpenAI-compatible (/v1/models), Ollama (/api/tags).
   * @returns {Promise<Array<{id: string, name: string}>>} List of available models
   */
  async fetchModels() {
    if (!this.endpoint) return [];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const headers = this._getHeaders();

    try {
      // Try Ollama endpoint first if local
      if (this._isOllama()) {
        const url = `${this.endpoint.replace(/\/+$/, '')}/api/tags`;
        const res = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          return (data.models || []).map(m => ({ id: m.name || m.model, name: m.name || m.model }));
        }
      }

      // OpenAI-compatible /v1/models (works for OpenAI, Mistral, Groq, Together, LM Studio, vLLM)
      const base = this.endpoint.replace(/\/+$/, '');
      const modelsUrl = base.endsWith('/v1') ? `${base}/models` : `${base}/v1/models`;
      const res = await fetch(modelsUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return [];
      const data = await res.json();
      const models = data.data || data.models || [];
      return models.map(m => ({
        id: m.id || m.name || m.model,
        name: m.id || m.name || m.model,
      })).sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[LLM] fetchModels failed:', err.message);
      return [];
    }
  }

  /**
   * Get adapter stats.
   * @returns {{totalCalls: number, totalTokens: number, avgLatency: number, failures: number}}
   */
  getStats() {
    return {
      totalCalls: this._totalCalls,
      totalTokens: this._totalTokens,
      avgLatency: this._totalCalls > 0
        ? Math.round(this._totalLatency / this._totalCalls)
        : 0,
      failures: this._failures,
    };
  }

  /**
   * Update configuration.
   * @param {object} config
   */
  updateConfig(config) {
    if (config.endpoint !== undefined) this.endpoint = config.endpoint.replace(/\/+$/, '');
    if (config.apiKey !== undefined) this.apiKey = config.apiKey;
    if (config.model !== undefined) this.model = config.model;
    if (config.timeout !== undefined) this.timeout = config.timeout;
  }

  // ─── Internal ────────────────────────────────────────────

  /**
   * Detect if this is a local LLM server (no API key needed).
   * Covers: Ollama, LM Studio, llama.cpp, vLLM, text-generation-webui, etc.
   * @returns {boolean}
   */
  _isLocal() {
    return /localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0/i.test(this.endpoint);
  }

  /**
   * Detect Ollama specifically (uses different request/response format).
   * @returns {boolean}
   */
  _isOllama() {
    return this._isLocal() && /(:11434|\/api\/)/i.test(this.endpoint);
  }

  _getUrl() {
    // If the user already provided a full URL with path, use it as-is
    const path = new URL(this.endpoint).pathname;
    if (path && path !== '/' && path.length > 1) {
      // User supplied a path component — check if it's a complete API route
      if (path.includes('/chat/completions') || path.includes('/api/chat') || path.includes('/api/generate')) {
        return this.endpoint;
      }
    }

    if (this._isOllama()) {
      return `${this.endpoint}/api/chat`;
    }
    // OpenAI-compatible (works for OpenAI, Mistral, Groq, Together, LM Studio, vLLM, etc.)
    // Append /chat/completions if endpoint ends with /v1 or similar
    const base = this.endpoint.replace(/\/+$/, '');
    if (base.endsWith('/v1')) {
      return `${base}/chat/completions`;
    }
    return `${base}/v1/chat/completions`;
  }

  _getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  _buildRequestBody(systemPrompt, userMessage) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    if (this._isOllama()) {
      return {
        model: this.model,
        messages,
        stream: false,
        options: { num_predict: this.maxOutputTokens },
      };
    }
    // OpenAI-compatible (works for OpenAI, Mistral, Groq, Together, LM Studio, vLLM)
    return {
      model: this.model,
      messages,
      max_tokens: this.maxOutputTokens,
      temperature: 0.7,
    };
  }

  _parseResponse(data) {
    // Ollama format
    if (data.message?.content) {
      return {
        response: data.message.content,
        tokensUsed: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      };
    }
    // OpenAI format
    if (data.choices?.[0]?.message?.content) {
      return {
        response: data.choices[0].message.content,
        tokensUsed: data.usage?.total_tokens || 0,
      };
    }
    return { response: '', tokensUsed: 0 };
  }
}

// ─── Singleton for game use ──────────────────────────────────

let _instance = null;

/**
 * Get or create the global LLM adapter instance.
 * If config is provided, always creates a new instance (re-init).
 * @param {object} [config] — pass config to (re)initialize
 * @returns {LLMAdapter|null} — returns null if no instance and no config
 */
export function getLLMAdapter(config) {
  if (config) {
    _instance = new LLMAdapter(config);
  }
  return _instance;
}

/**
 * Initialize the adapter from saved settings (localStorage).
 * Call this at run start so the Director can use it.
 */
export function initLLMFromSettings() {
  try {
    const raw = localStorage.getItem('surge_settings');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.llmEndpoint) return null;
    return getLLMAdapter({
      endpoint: s.llmEndpoint,
      apiKey: s.llmApiKey || '',
      model: s.llmModel || DEFAULTS.model,
      maxOutputTokens: s.llmTokens || DEFAULTS.maxOutputTokens,
    });
  } catch {
    return null;
  }
}

/**
 * Reset the global instance (for testing / reconfig).
 */
export function resetLLMAdapter() {
  _instance = null;
}

export default { LLMAdapter, getLLMAdapter, resetLLMAdapter, initLLMFromSettings };
