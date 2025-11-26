import { Tool } from '@langchain/core/tools';
import { BrightDataScraper } from './scraper';

export class WebSearchTool extends Tool {
  name = 'web_search';
  description = 'Useful for searching the web for current information. Input should be a search query string.';
  
  private scraper: BrightDataScraper;

  constructor(scraper: BrightDataScraper) {
    super();
    this.scraper = scraper;
  }

  async _call(query: string): Promise<string> {
    console.log(`🔍 Searching for: ${query}`);
    
    const results = await this.scraper.searchWeb(query);
    
    if (results.length === 0) {
      return 'No search results found. The web search failed or returned no data.';
    }

    // Return raw data for LLM to parse
    return `Web search results for "${query}":\n\n${results[0].snippet}`;
  }
}