# Quick Start Guide

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `apify` - Apify SDK for Actor development
- `crawlee` - Web scraping and browser automation library
- `cheerio` - Fast HTML parsing
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions

### 2. Build the Project

```bash
npm run build
```

This compiles TypeScript files from `src/` to `dist/`.

### 3. Run Locally

```bash
npm start
```

Or for development with ts-node:

```bash
npm run dev
```

## Configuration

### Using Default Settings

The Actor will use these defaults if no input is provided:
- **Start URLs**: TheresAnAIForThat, FutureTools, ProductHunt AI sections
- **Max Items**: 100 tools
- **Proxy**: Disabled

### Custom Input

Create `apify_storage/key_value_stores/default/INPUT.json`:

```json
{
  "startUrls": [
    "https://theresanaiforthat.com/ai/?ref=featured&v=full"
  ],
  "maxItems": 50,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

Or set via environment:

```bash
export ACTOR_INPUT='{"maxItems": 50}'
npm start
```

## Viewing Results

After running, results are stored in:
```
apify_storage/datasets/default/
```

Each scraped tool is saved as JSON with this structure:
```json
{
  "name": "Tool Name",
  "description": "What the tool does",
  "url": "https://example.com",
  "pricing": "Freemium",
  "category": "Productivity",
  "tags": ["AI", "Writing"],
  "source": "TheresAnAIForThat",
  "sourceUrl": "https://...",
  "scrapedAt": "2026-02-18T10:30:00.000Z"
}
```

## Deployment to Apify

### Using Apify CLI

```bash
# Install Apify CLI globally
npm install -g apify-cli

# Login to Apify
apify login

# Push to Apify platform
apify push
```

### Manual Upload

1. Go to [Apify Console](https://console.apify.com)
2. Create new Actor
3. Upload all files
4. Click "Build"
5. Run with desired input

## Common Issues

### Module Not Found Errors

The TypeScript errors about missing modules (crawlee, apify) are normal before running `npm install`. They will disappear after installation.

### No Data Extracted

If no data is extracted:
1. Check if the website structure has changed
2. Update CSS selectors in route handlers
3. Enable debug logging
4. Try with proxies enabled

### Rate Limiting

If you're being rate-limited:
1. Enable proxy configuration
2. Reduce `maxConcurrency` in `main.ts`
3. Increase delays between requests

## Testing

Test with a small dataset first:

```json
{
  "maxItems": 10
}
```

Then gradually increase once you verify everything works.

## Next Steps

1. **Run locally** to test
2. **Verify output** in `apify_storage/datasets/default/`
3. **Deploy to Apify** for production use
4. **Schedule runs** in Apify Console
5. **Integrate** via Apify API

## API Usage

Once deployed, call via API:

```javascript
const run = await client.actor('YOUR_ACTOR_ID').call({
  maxItems: 50,
  proxyConfiguration: {
    useApifyProxy: true
  }
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

## Support

- 📖 [Apify Documentation](https://docs.apify.com)
- 🕷️ [Crawlee Documentation](https://crawlee.dev)
- 💬 [Apify Discord](https://discord.gg/jyEM2PRvMU)

Happy scraping! 🚀
