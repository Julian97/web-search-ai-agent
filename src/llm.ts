import axios from 'axios';

export class NosanaLLM {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string, model?: string) {
    // Clean up the URL - remove trailing slashes and /api if present
    this.baseUrl = baseUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    // Use environment variable with fallback to provided model or default
    this.model = model || process.env.NOSANA_MODEL || 'ollama:0.12';
  }

  /**
   * Generate a completion using OpenAI-compatible format
   * This is more widely supported than native Ollama format
   */
  async generate(prompt: string): Promise<string> {
    // Use OpenAI-compatible endpoint
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    try {
      console.log(`🔄 Trying OpenAI-compatible format at: ${url}`);
      console.log(`📝 Using model: ${this.model}`);
      const response = await this.makeApiCall(url, {
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      });

      // OpenAI format response
      return this.parseResponse(response, 'openai');
      
    } catch (error: any) {
      console.error(`❌ OpenAI-compatible format failed:`);
      console.error(`   Status: ${error.response?.status || 'N/A'}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Response: ${JSON.stringify(error.response?.data || 'N/A', null, 2)}`);
      return this.handleApiError(error, url, () => this.generateNativeOllama(prompt));
    }
  }

  /**
   * Chat with conversation history
   */
  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const url = `${this.baseUrl}/v1/chat/completions`;
    
    try {
      const response = await this.makeApiCall(url, {
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      });

      return this.parseResponse(response, 'openai');
      
    } catch (error: any) {
      return this.handleApiError(error, url, () => this.chatNativeOllama(messages));
    }
  }

  /**
   * Centralized API call method
   */
  private async makeApiCall(url: string, data: any): Promise<any> {
    return await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
  }

  /**
   * Centralized response parsing
   */
  private parseResponse(response: any, format: 'openai' | 'ollama'): string {
    if (format === 'openai') {
      // Defensive check for response structure
      if (response && response.data && response.data.choices && 
          Array.isArray(response.data.choices) && response.data.choices.length > 0 &&
          response.data.choices[0].message && response.data.choices[0].message.content) {
        return response.data.choices[0].message.content;
      }
    } else {
      // Ollama format
      if (response && response.data && response.data.response) {
        return response.data.response;
      }
      if (response && response.data && response.data.message && response.data.message.content) {
        return response.data.message.content;
      }
    }
    
    throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`);
  }

  /**
   * Centralized error handling
   */
  private async handleApiError(error: any, url: string, fallback: () => Promise<string>): Promise<string> {
    if (error.response) {
      // If v1 endpoint doesn't work, try native Ollama
      if (error.response.status === 404 || error.response.status === 405) {
        console.log(`⚠️ Endpoint not found (${error.response.status}) at ${url}, trying fallback...`);
        return await fallback();
      }
      
      throw new Error(`Nosana API Error ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error(`No response from Nosana: ${error.message}`);
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  /**
   * Fallback: Try native Ollama format
   */
  private async generateNativeOllama(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;
    
    try {
      console.log(`🔄 Trying native Ollama format at: ${url}`);
      const response = await this.makeApiCall(url, {
        model: this.model,
        prompt: prompt,
        stream: false
      });

      return this.parseResponse(response, 'ollama');
    } catch (error: any) {
      console.error(`❌ Native Ollama format also failed:`);
      console.error(`   Status: ${error.response?.status || 'N/A'}`);
      console.error(`   Message: ${error.message}`);
      console.error(`   Response: ${JSON.stringify(error.response?.data || 'N/A', null, 2)}`);
      throw new Error(`Both API formats failed. Check Nosana documentation for correct endpoint.`);
    }
  }

  /**
   * Fallback: Native Ollama chat
   */
  private async chatNativeOllama(messages: Array<{ role: string; content: string }>): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    
    try {
      const response = await this.makeApiCall(url, {
        model: this.model,
        messages: messages,
        stream: false
      });

      return this.parseResponse(response, 'ollama');
    } catch (error: any) {
      throw new Error(`Native chat also failed: ${error.message}`);
    }
  }
}