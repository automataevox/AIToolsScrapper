import { Actor, log } from 'apify';
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { ActorInput, ScraperContext } from './types.js';
import { handleTheresAnAIForThat } from './routes/theresanaiforthat.js';
// import { producthuntRouter } from './routes/producthunt.js';

const DEFAULT_START_URLS = [
    'https://theresanaiforthat.com/leaderboard',
    'https://theresanaiforthat.com/leaderboard/year/2025',
    'https://theresanaiforthat.com/leaderboard/year/2024',
    //'https://www.producthunt.com/topics/artificial-intelligence',
];

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];

function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRouterForUrl(urlOrValue: unknown): 'THERESANAIFORTHAT' | 'DEFAULT' {
    // accept string or object with `url` property; be defensive to avoid runtime errors
    const urlStr = typeof urlOrValue === 'string'
        ? urlOrValue
        : (urlOrValue && typeof urlOrValue === 'object' && 'url' in (urlOrValue as any))
            ? (urlOrValue as any).url
            : '';

    const urlLower = (urlStr || '').toLowerCase();

    if (urlLower.includes('theresanaiforthat.com')) {
        return 'THERESANAIFORTHAT';
    }

    return 'DEFAULT';
}

Actor.main(async () => {
    log.info('AI Tools Directory Scraper starting...');

    const input = await Actor.getInput<ActorInput>();
    
    const rawStartUrls = input?.startUrls && input.startUrls.length > 0
        ? input.startUrls
        : DEFAULT_START_URLS;

    // Support both `string` entries and `{ url: string }` objects coming from the UI
    const startUrls: string[] = (rawStartUrls as any[]).map((s: any) => {
        if (typeof s === 'string') return s;
        if (s && typeof s === 'object' && typeof s.url === 'string') return s.url;
        return '';
    }).filter(Boolean);
    
    const maxItems = input?.maxItems ?? 1000;

    log.info(`Configuration: maxItems=${maxItems}, startUrls=${startUrls.length}`);

    let proxyConfiguration: ProxyConfiguration | undefined;
    
    if (input?.proxyConfiguration) {
        proxyConfiguration = await Actor.createProxyConfiguration({
            groups: input.proxyConfiguration.apifyProxyGroups,
            useApifyProxy: input.proxyConfiguration.useApifyProxy,
        });
        log.info('Proxy configuration enabled');
    }

    const context: ScraperContext = {
        scrapedCount: 0,
        maxItems,
        seenTools: new Set<string>(),
    };

    const crawler = new PlaywrightCrawler({
        proxyConfiguration,
        maxConcurrency: 2,
        maxRequestsPerCrawl: maxItems * 3,
        requestHandlerTimeoutSecs: 180,
        maxRequestRetries: 3,
        navigationTimeoutSecs: 60,
        headless: true,
        
        async requestHandler(crawlerContext) {
            const { request } = crawlerContext;
            const routerLabel = request.userData.label || getRouterForUrl(request.url);

            log.info(`Handling request: ${request.url} [${routerLabel}]`);

            if (context.scrapedCount >= context.maxItems) {
                log.info('Max items reached, stopping crawler');
                await crawler.autoscaledPool?.abort();
                return;
            }

            try {
                switch (routerLabel) {
                    case 'THERESANAIFORTHAT':
                        await handleTheresAnAIForThat(crawlerContext, context);
                        break;
                    default:
                        log.warning(`Unknown router label: ${routerLabel}, attempting auto-detection`);
                        const detectedLabel = getRouterForUrl(request.url);
                        if (detectedLabel !== 'DEFAULT') {
                            request.userData.label = detectedLabel;
                            if (detectedLabel === 'THERESANAIFORTHAT') {
                                await handleTheresAnAIForThat(crawlerContext, context);
                            }
                        } else {
                            log.error(`Could not determine router for URL: ${request.url}`);
                        }
                        break;
                }
            } catch (error) {
                log.error(`Error processing ${request.url}:`, error as Error);
                throw error;
            }

            const delay = Math.random() * 1000 + 500;
            await new Promise(resolve => setTimeout(resolve, delay));
        },

        preNavigationHooks: [
            async ({ request }: { request: any }) => {
                request.headers = {
                    ...request.headers,
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                };
            },
        ],

        failedRequestHandler: async ({ request }: { request: any }, error: Error) => {
            log.error(`Request ${request.url} failed after ${request.retryCount} retries:`, error);
        },
    });

    Object.assign(crawler.stats, context);

    const requests = startUrls.map((url: string) => ({
        url,
        userData: {
            label: getRouterForUrl(url),
        },
    }));

    await crawler.run(requests);

    const finalContext = crawler.stats as unknown as ScraperContext;
    log.info(`Scraping completed. Total items scraped: ${finalContext.scrapedCount}`);
    
    await Actor.exit();
});
