import { Dataset, PlaywrightCrawlingContext } from 'crawlee';
import { ExtractedTool, ScraperContext } from '../types.js';
import { extractUrl } from '../utils/extractors.js';
import { normalizeTool, isDuplicateTool, createToolKey } from '../utils/normalize.js';
import { log } from 'apify';

export async function handleTheresAnAIForThat(crawlerContext: PlaywrightCrawlingContext, context: ScraperContext) {
    const { page, request, enqueueLinks } = crawlerContext;
    
    log.info(`Processing TheresAnAIForThat.com: ${request.url}`);

    if (context.scrapedCount >= context.maxItems) {
        log.info('Max items reached, skipping processing');
        return;
    }

    // Wait for the page to load
    await page.waitForSelector('.tool-card', { timeout: 30000 }).catch(() => {
        log.warning('No .tool-card found, page might have different structure');
    });

    // Handle infinite scroll by scrolling and waiting for new content
    let previousToolCount = 0;
    let currentToolCount = 0;
    let noNewContentCount = 0;
    const maxScrollAttempts = Math.ceil(context.maxItems / 50); // ~50 tools per scroll batch
    
    log.info('Starting infinite scroll...');
    
    for (let i = 0; i < maxScrollAttempts && context.scrapedCount < context.maxItems; i++) {
        // Scroll to bottom
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for new content to load
        await page.waitForTimeout(1500);
        
        // Check how many tools are now visible
        currentToolCount = await page.locator('.tool-card').count();
        
        if (currentToolCount === previousToolCount) {
            noNewContentCount++;
            log.info(`No new tools loaded (${noNewContentCount}/3). Current: ${currentToolCount}`);
            
            // If no new content after 3 attempts, we've reached the end
            if (noNewContentCount >= 3) {
                log.info('Reached end of infinite scroll');
                break;
            }
        } else {
            noNewContentCount = 0;
            log.info(`Tools loaded: ${currentToolCount} (scroll ${i + 1})`);
        }
        
        previousToolCount = currentToolCount;
        
        // Stop if we have enough tools
        if (currentToolCount >= context.maxItems) {
            log.info(`Loaded enough tools: ${currentToolCount}`);
            break;
        }
    }
    
    log.info(`Finished scrolling. Total tool cards found: ${currentToolCount}`);

    // Extract all tools from the page using page.evaluate for better performance
    log.info('Extracting tools data...');
    const tools: ExtractedTool[] = await page.evaluate(() => {
        const toolCards = document.querySelectorAll('.tool-card');
        const results: any[] = [];
        
        toolCards.forEach((card) => {
            try {
                const nameEl = card.querySelector('[class*="tool-name"]');
                const versionEl = card.querySelector('[class*="tool-version"]');
                const descEl = card.querySelector('[class*="tool-description"]');
                const linkEl = card.querySelector('a');
                const categoryEl = card.querySelector('[class*="task_label"]');
                
                const name = nameEl?.textContent?.trim() || '';
                const version = versionEl?.textContent?.trim() || '';
                const description = descEl?.textContent?.trim() || '';
                const url = linkEl?.getAttribute('href') || '';
                const category = categoryEl?.textContent?.trim() || '';
                
                if (name && description && url) {
                    results.push({
                        name,
                        version,
                        description,
                        url,
                        category: category || undefined
                    });
                }
            } catch (e) {
                // Skip this tool
            }
        });
        
        return results;
    });
    
    log.info(`Extracted ${tools.length} tools from page`);
    
    // Process and normalize the extracted tools
    for (const tool of tools) {
        if (context.scrapedCount >= context.maxItems) {
            break;
        }

        // Fix relative URLs
        const fullUrl = extractUrl(tool.url, request.loadedUrl || request.url);
        tool.url = fullUrl;

        const normalized = normalizeTool(tool, 'TheresAnAIForThat', request.loadedUrl || request.url);
        
        if (normalized && !isDuplicateTool(normalized, context.seenTools)) {
            await Dataset.pushData(normalized);
            context.seenTools.add(createToolKey(normalized));
            context.scrapedCount++;
            
            if (context.scrapedCount % 10 === 0 || context.scrapedCount <= 10) {
                log.info(`Scraped tool: ${normalized.name} (${context.scrapedCount}/${context.maxItems})`);
            }
        }
    }
    
    log.info(`Total scraped: ${context.scrapedCount}/${context.maxItems}`);

    // Optionally enqueue pagination links for listing pages (not infinite scroll pages)
    const isInfiniteScrollPage = request.url.includes('/ai/') || 
                                  request.url.match(/theresanaiforthat\.com\/[a-z0-9-]+(?:\?|$)/);
    
    if (context.scrapedCount < context.maxItems && !isInfiniteScrollPage) {
        await enqueueLinks({
            selector: 'a[href*="page"], a[href*="?p="], .pagination a, a.next',
            label: 'THERESANAIFORTHAT',
            limit: 10,
        });
    }
}
