import { createCheerioRouter, Dataset, CheerioCrawlingContext } from 'crawlee';
import { ExtractedTool, ScraperContext } from '../types.js';
import { extractPricing, extractTagsFromText, extractUrl, cleanText } from '../utils/extractors.js';
import { normalizeTool, isDuplicateTool, createToolKey } from '../utils/normalize.js';
import { log } from 'apify';

export const theresanaiforthatRouter = createCheerioRouter();

theresanaiforthatRouter.addDefaultHandler(async ({ $, request, enqueueLinks, crawler }: CheerioCrawlingContext) => {
    log.info(`Processing TheresAnAIForThat.com: ${request.url}`);
    
    const context = crawler.stats as unknown as ScraperContext;

    if (context.scrapedCount >= context.maxItems) {
        log.info('Max items reached, skipping processing');
        return;
    }

    const tools: ExtractedTool[] = [];

    $('div[class*="tool"], article[class*="tool"], .tool-card, div[data-testid*="tool"]').each((_: number, element: any): any => {
        if (context.scrapedCount >= context.maxItems) {
            return false;
        }

        const $el = $(element);
        
        const name = cleanText(
            $el.find('h2, h3, h4, .tool-name, [class*="title"]').first().text() ||
            $el.find('a').first().text()
        );

        const description = cleanText(
            $el.find('p, .description, [class*="description"]').first().text()
        );

        let url = $el.find('a').first().attr('href') || '';
        if (url) {
            url = extractUrl(url, request.loadedUrl || request.url);
        }

        if (!name || !description || !url) {
            return;
        }

        const fullText = $el.text();
        const pricing = extractPricing(fullText);
        const tags = extractTagsFromText(fullText);

        const categoryElement = $el.find('.category, [class*="category"]').first();
        const category = categoryElement.length > 0 ? cleanText(categoryElement.text()) : undefined;

        tools.push({
            name,
            description,
            url,
            pricing,
            category,
            tags: tags.length > 0 ? tags : undefined,
        });
    });

    for (const tool of tools) {
        if (context.scrapedCount >= context.maxItems) {
            break;
        }

        const normalized = normalizeTool(tool, 'TheresAnAIForThat', request.loadedUrl || request.url);
        
        if (normalized && !isDuplicateTool(normalized, context.seenTools)) {
            await Dataset.pushData(normalized);
            context.seenTools.add(createToolKey(normalized));
            context.scrapedCount++;
            log.info(`Scraped tool: ${normalized.name} (${context.scrapedCount}/${context.maxItems})`);
        }
    }

    if (context.scrapedCount < context.maxItems) {
        await enqueueLinks({
            selector: 'a[href*="page"], a[href*="?p="], .pagination a, a.next',
            label: 'THERESANAIFORTHAT',
            limit: 10,
        });
    }
});
