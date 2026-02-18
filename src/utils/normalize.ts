import { AITool, ExtractedTool } from '../types.js';
import { cleanText, isValidUrl } from './extractors.js';

export function normalizeTool(
    tool: ExtractedTool,
    source: string,
    sourceUrl: string
): AITool | null {
    const name = cleanText(tool.name);
    const description = cleanText(tool.description);
    const url = tool.url.trim();

    if (!name || name.length < 2) {
        return null;
    }

    if (!description || description.length < 10) {
        return null;
    }

    if (!url || !isValidUrl(url)) {
        return null;
    }

    return {
        name,
        description,
        url,
        pricing: tool.pricing,
        category: tool.category ? cleanText(tool.category) : undefined,
        tags: tool.tags && tool.tags.length > 0 ? tool.tags : undefined,
        source,
        sourceUrl,
        scrapedAt: new Date().toISOString(),
    };
}

export function createToolKey(tool: AITool): string {
    const nameKey = tool.name.toLowerCase().trim();
    const urlKey = tool.url.toLowerCase().trim();
    return `${nameKey}|||${urlKey}`;
}

export function isDuplicateTool(tool: AITool, seenTools: Set<string>): boolean {
    const key = createToolKey(tool);
    return seenTools.has(key);
}
