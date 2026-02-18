export interface AITool {
    name: string;
    description: string;
    url: string;
    pricing?: string;
    category?: string;
    tags?: string[];
    source: string;
    sourceUrl: string;
    scrapedAt: string;
}

export interface ActorInput {
    startUrls?: string[];
    maxItems?: number;
    proxyConfiguration?: {
        useApifyProxy?: boolean;
        apifyProxyGroups?: string[];
    };
}

export interface ScraperContext {
    scrapedCount: number;
    maxItems: number;
    seenTools: Set<string>;
}

export interface ExtractedTool {
    name: string;
    description: string;
    url: string;
    pricing?: string;
    category?: string;
    tags?: string[];
}
