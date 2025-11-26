import axios from 'axios';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class BrightDataScraper {
  private apiToken: string;
  private baseUrl = 'https://api.brightdata.com';
  private zone: string;

  constructor(apiToken: string, zone: string = 'serp_api1') {
    this.apiToken = apiToken;
    this.zone = zone;
  }

  async searchWeb(query: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Searching for: "${query}"`);
      
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=us`;
      
      const response = await axios.post(
        `${this.baseUrl}/request`,
        {
          zone: this.zone,
          url: searchUrl,
          format: 'json'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          params: {
            brd_json: 1
          }
        }
      );

      console.log(`✅ BrightData returned results`);
      
      return this.formatRawResults(response.data);
      
    } catch (error: any) {
      console.error('❌ BrightData Error:', error.response?.status || error.message);
      
      if (error.response?.status === 401) {
        console.error('   Check your BRIGHTDATA_API_TOKEN in .env');
      } else if (error.response?.status === 403) {
        console.error('   Check your zone configuration and permissions');
      }
      
      return [];
    }
  }

  /**
   * Format raw BrightData response
   * We pass raw data to the LLM - it's smart enough to parse it!
   */
  private formatRawResults(data: any): SearchResult[] {
    if (!data) {
      return [];
    }

    // Convert to string for LLM processing
    const dataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    
    // Return as single result containing all data
    return [{
      title: 'Search Results',
      url: 'https://www.google.com',
      snippet: dataString.substring(0, 5000) // Limit to avoid token limits
    }];
  }
}