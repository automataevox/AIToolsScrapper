# AI Tools Directory Scraper

A production-ready Apify Actor that scrapes AI tool directory websites and extracts structured data about AI tools, including names, descriptions, URLs, and categories.

## 🎯 Features

- **TheresAnAIForThat.com Scraping**: 
  - Supports infinite scroll pages
  - Handles dynamic JavaScript content using Playwright
  - Scrapes leaderboards and individual tool category pages

- **Structured Data Extraction**: Extracts comprehensive information:
  - Tool name and description
  - Official website URL
  - Tool category
  - Source and timestamp

- **Smart Features**:
  - **Infinite scroll handling** - Automatically scrolls and loads all available tools
  - **Deduplication** by name + URL
  - Configurable item limits (default: 1000)
  - Proxy support for anti-blocking
  - Fast extraction using browser-side evaluation

- **Production Quality**:
  - Written in TypeScript with strict typing
  - Uses Playwright for JavaScript-rendered content
  - Modular architecture for easy extension
  - Comprehensive error handling
  - Request throttling and random delays
  - Rotating user agents

## 📦 Output Data Structure

Each scraped tool follows this schema:

```json
{
  "name": "ChatGPT",
  "description": "AI-powered conversational assistant that can answer questions, write content, and help with various tasks",
  "url": "https://chat.openai.com",
  "category": "Chatbots",
  "source": "TheresAnAIForThat",
  "sourceUrl": "https://theresanaiforthat.com/leaderboard/",
  "scrapedAt": "2026-02-18T10:30:00.000Z"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Name of the AI tool |
| `description` | string | Description of what the tool does |
| `url` | string | Official website URL |
| `category` | string? | Tool category (e.g., Chatbots, Audio, Design) |
| `source` | string | Source website name |
| `sourceUrl` | string | URL where the tool was found |
| `scrapedAt` | string | ISO timestamp of when it was scraped |

## ⚙️ Input Configuration

### Input Schema

```json
{
  "startUrls": [
    "https://theresanaiforthat.com/leaderboard"
  ],
  "maxItems": 1000,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

### Input Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startUrls` | string[] | ["https://theresanaiforthat.com/leaderboard"] | URLs to start scraping from |
| `maxItems` | number | 1000 | Maximum number of tools to scrape |
| `proxyConfiguration` | object | undefined | Proxy settings for the crawler |
| `proxyConfiguration.useApifyProxy` | boolean | false | Whether to use Apify proxy |
| `proxyConfiguration.apifyProxyGroups` | string[] | undefined | Proxy groups to use |

If no `startUrls` are provided, the Actor uses these defaults:
- `https://theresanaiforthat.com/ai/?ref=featured&v=full`
- `https://www.futuretools.io/?pricing-model=free`
- `https://www.producthunt.com/topics/artificial-intelligence`

## 🚀 How to Run

### On Apify Platform

1. **Go to Apify Console**
   - Navigate to [Apify Console](https://console.apify.com)
   
2. **Create New Actor**
   - Click "Actors" → "Create new"
   - Choose "Example template" or start from scratch
   
3. **Upload Code**
   - Copy all files from this project
   - Paste into the Apify code editor
   
4. **Build**
   - Click "Build" and wait for completion
   
5. **Run**
   - Go to "Input" tab
   - Configure your input (or use defaults)
   - Click "Start"

### Locally

#### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn

#### Installation

```bash
# Clone or download this project
cd ai-tools-directory-scraper

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally
npm start
```

#### With Apify CLI

```bash
# Install Apify CLI
npm install -g apify-cli

# Login to Apify
apify login

# Run locally
apify run

# Push to Apify platform
apify push
```

## 🔧 Development

### Project Structure

```
src/
├── main.ts                      # Entry point and crawler setup
├── types.ts                     # TypeScript interfaces
├── routes/
│   ├── theresanaiforthat.ts    # TheresAnAIForThat.com scraper
│   ├── futuretools.ts          # FutureTools.io scraper
│   └── producthunt.ts          # ProductHunt.com scraper
└── utils/
    ├── extractors.ts           # Data extraction utilities
    └── normalize.ts            # Data normalization utilities
```

### Adding New Sources

To add a new AI tool directory:

1. Create a new router in `src/routes/newsource.ts`:

```typescript
import { createCheerioRouter } from 'crawlee';

export const newsourceRouter = createCheerioRouter();

newsourceRouter.addDefaultHandler(async ({ $, request, crawler }) => {
  // Implement scraping logic
});
```

2. Import and register in `src/main.ts`:

```typescript
import { newsourceRouter } from './routes/newsource.js';

// Add to router switch statement
case 'NEWSOURCE':
  await newsourceRouter(crawlerContext);
  break;
```

3. Add detection logic to `getRouterForUrl()`:

```typescript
if (urlLower.includes('newsource.com')) {
  return 'NEWSOURCE';
}
```

### TypeScript Configuration

The project uses strict TypeScript settings:
- No implicit any
- Strict null checks
- Strict function types
- No unused locals/parameters

## 📊 Example API Call

Using the Apify API:

```bash
curl -X POST https://api.apify.com/v2/acts/YOUR_ACTOR_ID/runs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{
    "maxItems": 50,
    "proxyConfiguration": {
      "useApifyProxy": true
    }
  }'
```

Using Apify JavaScript SDK:

```javascript
const { ApifyClient } = require('apify-client');

const client = new ApifyClient({
  token: 'YOUR_API_TOKEN',
});

const run = await client.actor('YOUR_ACTOR_ID').call({
  maxItems: 50,
  startUrls: ['https://theresanaiforthat.com/ai/'],
  proxyConfiguration: {
    useApifyProxy: true,
  },
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

## 🛡 Anti-Blocking Measures

The Actor implements several anti-blocking strategies:

- **Rotating User Agents**: Random realistic browser user agents
- **Request Delays**: Random delays (500-1500ms) between requests
- **Proxy Support**: Full Apify Proxy integration
- **Concurrency Limits**: Maximum 5 concurrent requests
- **Retry Logic**: Up to 3 retries for failed requests
- **Timeout Handling**: 60-second request timeout

### Respecting robots.txt

While this Actor doesn't automatically parse robots.txt, you should:
- Review each site's robots.txt before large-scale scraping
- Respect crawl-delay directives
- Add appropriate delays between requests
- Use appropriate request concurrency

## 📈 Performance

- **Speed**: ~10-30 tools per minute (varies by source)
- **Concurrency**: 5 concurrent requests (configurable)
- **Memory**: ~256-512MB typical usage
- **Timeout**: 60 seconds per request

## 🐛 Troubleshooting

### No Data Extracted

- **Check the website structure**: Websites often change their HTML structure
- **Verify selectors**: Update CSS selectors in route handlers
- **Enable debug logs**: Set log level to DEBUG in Actor settings

### Rate Limiting / Blocking

- **Enable proxies**: Use `proxyConfiguration` with residential proxies
- **Reduce concurrency**: Lower `maxConcurrency` in crawler config
- **Increase delays**: Add longer delays between requests

### TypeScript Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

## 📄 License

Apache-2.0

## 🤝 Contributing

Contributions are welcome! To add new sources or improve existing scrapers:

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact via Apify support
- Check Apify documentation

## 🏪 Apify Store Description

**AI Tools Directory Scraper** - Extract structured data from leading AI tool directories including TheresAnAIForThat, FutureTools, and ProductHunt. Get tool names, descriptions, URLs, pricing, categories, and tags in a clean, structured format.

Perfect for:
- Market research and competitive analysis
- Building AI tool aggregators
- Tracking AI tool launches
- Price monitoring
- Content creation and curation

Built with TypeScript, Crawlee, and production-grade architecture. Includes deduplication, pagination, proxy support, and extensible design for adding new sources.

---

**Built with ❤️ using [Apify](https://apify.com) and [Crawlee](https://crawlee.dev)**
