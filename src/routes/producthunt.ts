// src/routes/producthunt.ts

import { createCheerioRouter, Dataset, CheerioCrawlingContext } from 'crawlee';
import { ExtractedTool, ScraperContext } from '../types.js';
import { extractPricing, extractTagsFromText, extractUrl, cleanText } from '../utils/extractors.js';
import { normalizeTool, isDuplicateTool, createToolKey } from '../utils/normalize.js';
import { log } from 'apify';

export const producthuntRouter = createCheerioRouter();

// Handler for ProductHunt listing pages
producthuntRouter.addHandler('PRODUCTHUNT_LIST', async ({ $, request, enqueueLinks, crawler }: CheerioCrawlingContext) => {
    log.info(`Processing ProductHunt listing page: ${request.url}`);
    
    const context = crawler.stats as unknown as ScraperContext;

    if (context.scrapedCount >= context.maxItems) {
        log.info('Max items reached, skipping processing');
        return;
    }

    // Enqueue detail page links from the listing
    const detailLinks: string[] = [];
    
    // Try multiple selectors to find product links
    $('a[href*="/posts/"]').each((_: number, element: any) => {
        const href = $(element).attr('href');
        if (href && href.match(/\/posts\/[\w-]+$/)) {
            const fullUrl = extractUrl(href, request.loadedUrl || request.url);
            if (!detailLinks.includes(fullUrl)) {
                detailLinks.push(fullUrl);
            }
        }
    });

    // Also try ul > li structure mentioned by user
    $('#content ul li a, [id*="content"] ul li a').each((_: number, element: any) => {
        const href = $(element).attr('href');
        if (href && href.includes('/posts/')) {
            const fullUrl = extractUrl(href, request.loadedUrl || request.url);
            if (!detailLinks.includes(fullUrl)) {
                detailLinks.push(fullUrl);
            }
        }
    });

    log.info(`Found ${detailLinks.length} product detail links`);

    // Enqueue detail pages with the specific label
    for (const link of detailLinks.slice(0, context.maxItems - context.scrapedCount)) {
        await crawler.addRequests([{
            url: link,
            label: 'PRODUCTHUNT_DETAIL',
        }]);
    }

    // Enqueue next page if needed
    if (context.scrapedCount < context.maxItems) {
        await enqueueLinks({
            selector: 'a[href*="page"], .pagination a, a[rel="next"]',
            label: 'PRODUCTHUNT_LIST',
            limit: 3,
        });
    }
});

// Handler for ProductHunt detail pages
producthuntRouter.addHandler('PRODUCTHUNT_DETAIL', async ({ $, request, crawler }: CheerioCrawlingContext) => {
    log.info(`Processing ProductHunt detail page: ${request.url}`);
    
    const context = crawler.stats as unknown as ScraperContext;

    if (context.scrapedCount >= context.maxItems) {
        log.info('Max items reached, skipping processing');
        return;
    }

    // Extract detailed information from the product page
    const name = cleanText(
        $('h1').first().text() ||
        $('[class*="product-name"], [class*="title"]').first().text()
    );

    const description = cleanText(
        $('[class*="tagline"]').first().text() ||
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        $('p').first().text()
    );

    // Get the actual product URL (not the ProductHunt page)
    let url = '';
    const websiteLink = $('a[href*="http"]:not([href*="producthunt.com"])').first();
    if (websiteLink.length > 0) {
        url = cleanText(websiteLink.attr('href') || '');
    }
    
    // Fallback to meta tags
    if (!url) {
        url = $('meta[property="og:url"]').attr('content') || '';
    }

    // If still no URL, skip this product
    if (!name || !description || !url || url.includes('producthunt.com')) {
        log.warning(`Incomplete data for ${name || 'unknown'}, skipping`);
        return;
    }

    const fullText = $('body').text();
    const pricing = extractPricing(fullText);

    // Extract topics/tags
    const topicElements = $('[class*="topic"], [class*="tag"], [class*="badge"]');
    let tags: string[] = [];
    topicElements.each((_: number, tag: any) => {
        const tagText = cleanText($(tag).text());
        if (tagText && tagText.length > 2 && tagText.length < 50) {
            tags.push(tagText);
        }
    });

    if (tags.length === 0) {
        tags = extractTagsFromText(fullText);
    }

    const tool: ExtractedTool = {
        name,
        description,
        url,
        pricing,
        category: 'Artificial Intelligence',
        tags: tags.length > 0 ? tags : undefined,
    };

    const normalized = normalizeTool(tool, 'ProductHunt', request.loadedUrl || request.url);
    
    if (normalized && !isDuplicateTool(normalized, context.seenTools)) {
        await Dataset.pushData(normalized);
        context.seenTools.add(createToolKey(normalized));
        context.scrapedCount++;
        log.info(`Scraped tool: ${normalized.name} (${context.scrapedCount}/${context.maxItems})`);
    }
});

// Default handler for backward compatibility (treats as listing page)
producthuntRouter.addDefaultHandler(async (ctx: CheerioCrawlingContext) => {
    log.info(`Processing ProductHunt.com (default): ${ctx.request.url}`);
    
    const context = ctx.crawler.stats as unknown as ScraperContext;

    if (context.scrapedCount >= context.maxItems) {
        log.info('Max items reached, skipping processing');
        return;
    }

    // Check if this is a detail page or listing page based on URL
    if (ctx.request.url.includes('/posts/')) {
        // Set label and let the router handle it
        ctx.request.userData.label = 'PRODUCTHUNT_DETAIL';
    } else {
        // Set label for listing page
        ctx.request.userData.label = 'PRODUCTHUNT_LIST';
    }
    
    // Re-route with the proper label
    await producthuntRouter(ctx);
});
