# ProductHunt Scraper Update

## Changes Made

The ProductHunt scraper has been enhanced to navigate to detail pages for more complete data extraction, as requested.

### New Architecture

The scraper now uses a **two-stage approach**:

#### 1. **Listing Page Handler** (`PRODUCTHUNT_LIST`)
- Processes main listing pages (e.g., `/topics/artificial-intelligence`)
- Finds all product links using multiple selectors:
  - `a[href*="/posts/"]` - Standard product links
  - `#content ul li a` - The ul/li structure you mentioned
  - `[id*="content"] ul li a` - Alternative content containers
- Enqueues detail page URLs with label `PRODUCTHUNT_DETAIL`
- Handles pagination to next listing pages

#### 2. **Detail Page Handler** (`PRODUCTHUNT_DETAIL`)
- Processes individual product pages (e.g., `/posts/tool-name`)
- Extracts comprehensive information:
  - **Name**: From `<h1>` or product name elements
  - **Description**: From tagline, meta tags, or OG tags
  - **URL**: Actual product website (not ProductHunt URL)
    - Filters out ProductHunt links
    - Looks for external website links
  - **Pricing**: Heuristic detection from page content
  - **Tags**: From topic/tag/badge elements
  - **Category**: Set to "Artificial Intelligence"

### Key Improvements

1. **Better Data Quality**: Detail pages contain more complete information
2. **Accurate URLs**: Extracts actual product websites, not ProductHunt pages
3. **Flexible Selectors**: Works with the `#content > ul > li` structure you mentioned
4. **Smart Routing**: Automatically detects whether a URL is a listing or detail page
5. **Deduplication**: Still prevents duplicate entries
6. **Max Items Respect**: Stops when reaching the configured limit

### How It Works

```
Start URL: https://www.producthunt.com/topics/artificial-intelligence
    ↓
[PRODUCTHUNT_LIST Handler]
    ↓
Finds product links in #content ul li and other selectors
    ↓
Enqueues: /posts/product-1, /posts/product-2, etc.
    ↓
[PRODUCTHUNT_DETAIL Handler] (for each product)
    ↓
Extracts full product details
    ↓
Saves to dataset
```

### Router Labels

The scraper now uses three labels:
- `PRODUCTHUNT_LIST` - For listing pages
- `PRODUCTHUNT_DETAIL` - For product detail pages  
- `PRODUCTHUNT` - Default (auto-detects and routes appropriately)

### Backward Compatibility

The default handler automatically detects the page type:
- If URL contains `/posts/` → Routes to detail handler
- Otherwise → Routes to listing handler

This ensures existing configurations continue to work.

### Main.ts Integration

The main crawler has been updated to handle all three ProductHunt labels:
```typescript
case 'PRODUCTHUNT':
case 'PRODUCTHUNT_LIST':
case 'PRODUCTHUNT_DETAIL':
    await producthuntRouter(crawlerContext);
    break;
```

The router internally dispatches to the correct handler based on the label.

## Testing

To test the updated scraper:

```bash
npm run build
npm start
```

The scraper will now:
1. Visit the ProductHunt AI topic page
2. Extract all product links from the listing
3. Navigate to each product's detail page
4. Extract comprehensive information
5. Save only products with valid external URLs

## Example Output

```json
{
  "name": "ChatGPT",
  "description": "AI-powered conversational assistant...",
  "url": "https://chat.openai.com",
  "pricing": "Freemium",
  "category": "Artificial Intelligence",
  "tags": ["AI", "Chatbot", "Natural Language Processing"],
  "source": "ProductHunt",
  "sourceUrl": "https://www.producthunt.com/posts/chatgpt",
  "scrapedAt": "2026-02-18T..."
}
```

Note: The `url` field now contains the actual product website, not a ProductHunt URL.
