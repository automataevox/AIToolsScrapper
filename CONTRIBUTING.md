# Contributing to AI Tools Directory Scraper

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Any error messages or logs
- Your environment (Node.js version, OS, etc.)

### Adding New Sources

To add support for a new AI tool directory:

1. **Create a new route handler** in `src/routes/newsource.ts`:

```typescript
import { createCheerioRouter, Dataset, CheerioCrawlingContext } from 'crawlee';
import { ExtractedTool, ScraperContext } from '../types.js';
import { extractPricing, extractTagsFromText, extractUrl, cleanText } from '../utils/extractors.js';
import { normalizeTool, isDuplicateTool, createToolKey } from '../utils/normalize.js';
import { log } from 'apify';

export const newsourceRouter = createCheerioRouter();

newsourceRouter.addDefaultHandler(async ({ $, request, enqueueLinks, crawler }: CheerioCrawlingContext) => {
    log.info(`Processing NewSource: ${request.url}`);
    
    const context = crawler.stats as unknown as ScraperContext;

    if (context.scrapedCount >= context.maxItems) {
        log.info('Max items reached, skipping processing');
        return;
    }

    // Implement your scraping logic here
    // Use appropriate CSS selectors for the target website
    // Extract: name, description, url, pricing, category, tags
    
    // Example structure:
    const tools: ExtractedTool[] = [];
    
    $('.tool-selector').each((_: number, element: any) => {
        const $el = $(element);
        
        const name = cleanText($el.find('.name-selector').text());
        const description = cleanText($el.find('.description-selector').text());
        const url = extractUrl($el.find('a').attr('href') || '', request.loadedUrl || request.url);
        
        // Extract additional fields...
        
        tools.push({ name, description, url /* ... */ });
    });

    // Normalize and save tools
    for (const tool of tools) {
        if (context.scrapedCount >= context.maxItems) break;
        
        const normalized = normalizeTool(tool, 'NewSource', request.loadedUrl || request.url);
        
        if (normalized && !isDuplicateTool(normalized, context.seenTools)) {
            await Dataset.pushData(normalized);
            context.seenTools.add(createToolKey(normalized));
            context.scrapedCount++;
            log.info(`Scraped tool: ${normalized.name}`);
        }
    }

    // Handle pagination if needed
    if (context.scrapedCount < context.maxItems) {
        await enqueueLinks({
            selector: '.pagination a',
            label: 'NEWSOURCE',
        });
    }
});
```

2. **Register the router** in `src/main.ts`:

```typescript
// Import
import { newsourceRouter } from './routes/newsource.js';

// Add to DEFAULT_START_URLS if appropriate
const DEFAULT_START_URLS = [
    // ... existing URLs
    'https://newsource.com/ai-tools',
];

// Add to getRouterForUrl function
function getRouterForUrl(url: string): string {
    const urlLower = url.toLowerCase();
    // ... existing conditions
    if (urlLower.includes('newsource.com')) {
        return 'NEWSOURCE';
    }
    return 'DEFAULT';
}

// Add to router switch in requestHandler
switch (routerLabel) {
    // ... existing cases
    case 'NEWSOURCE':
        await newsourceRouter(crawlerContext);
        break;
}
```

3. **Test your implementation**:
   - Run locally with your new URL
   - Verify data extraction
   - Check pagination
   - Ensure deduplication works

4. **Update documentation**:
   - Add the new source to README.md
   - Update the features list
   - Add example output if structure differs

### Improving Existing Scrapers

Websites change their structure frequently. To update a scraper:

1. Inspect the target website's current HTML structure
2. Update CSS selectors in the appropriate route handler
3. Test thoroughly to ensure all fields are extracted
4. Update any expected output examples

### Code Style

- Use TypeScript with strict mode
- Follow existing code patterns
- Add proper type annotations
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Testing

Before submitting:
- Test locally with `npm start`
- Verify all sources work correctly
- Check maxItems limit works
- Ensure deduplication functions properly
- Test with and without proxies

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-source`)
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Create a pull request with:
   - Description of changes
   - Why the changes are needed
   - Test results
   - Any breaking changes

## Development Setup

```bash
# Clone repository
git clone <repository-url>
cd ai-tools-directory-scraper

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Build
npm run build

# Run locally
npm start
```

## Questions?

Feel free to open an issue for any questions or clarifications needed.

Thank you for contributing! 🎉
