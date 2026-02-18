import { Actor, log } from 'apify';
import { CheerioCrawler, ProxyConfiguration, CheerioCrawlingContext } from 'crawlee';
import { ActorInput, ScraperContext } from './types.js';
import { theresanaiforthatRouter } from './routes/theresanaiforthat.js';
import { producthuntRouter } from './routes/producthunt.js';

const DEFAULT_START_URLS = [
    'https://theresanaiforthat.com/ai/?ref=featured&v=full',
    'https://www.producthunt.com/topics/artificial-intelligence',
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

function getRouterForUrl(url: string): 'THERESANAIFORTHAT' | 'FUTURETOOLS' | 'PRODUCTHUNT' | 'PRODUCTHUNT_LIST' | 'PRODUCTHUNT_DETAIL' | 'DEFAULT' {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('theresanaiforthat.com')) {
        return 'THERESANAIFORTHAT';
    }
    if (urlLower.includes('producthunt.com')) {
        // Check if it's a detail page
        if (urlLower.includes('/posts/')) {
            return 'PRODUCTHUNT_DETAIL';
        }
        // Otherwise it's a listing page
        return 'PRODUCTHUNT_LIST';
    }
    
    return 'DEFAULT';
}

Actor.main(async () => {
    log.info('AI Tools Directory Scraper starting...');

    const input = await Actor.getInput<ActorInput>();
    
    const startUrls = input?.startUrls && input.startUrls.length > 0 
        ? input.startUrls 
        : DEFAULT_START_URLS;
    
    const maxItems = input?.maxItems ?? 100;

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

    const crawler = new CheerioCrawler({
        proxyConfiguration,
        maxConcurrency: 5,
        maxRequestsPerCrawl: maxItems * 3,
        requestHandlerTimeoutSecs: 60,
        maxRequestRetries: 3,
        navigationTimeoutSecs: 30,
        
        async requestHandler(crawlerContext: CheerioCrawlingContext) {
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
                        await theresanaiforthatRouter(crawlerContext);
                        break;
                    case 'PRODUCTHUNT':
                    case 'PRODUCTHUNT_LIST':
                    case 'PRODUCTHUNT_DETAIL':
                        await producthuntRouter(crawlerContext);
                        break;
                    default:
                        log.warning(`Unknown router label: ${routerLabel}, attempting auto-detection`);
                        const detectedLabel = getRouterForUrl(request.url);
                        if (detectedLabel !== 'DEFAULT') {
                            request.userData.label = detectedLabel;
                            switch (detectedLabel) {
                                case 'THERESANAIFORTHAT':
                                    await theresanaiforthatRouter(crawlerContext);
                                    break;
                                case 'PRODUCTHUNT':
                                case 'PRODUCTHUNT_LIST':
                                case 'PRODUCTHUNT_DETAIL':
                                    await producthuntRouter(crawlerContext);
                                    break;
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

    log.info(`Scraping completed. Total items scraped: ${context.scrapedCount}`);
    
    await Actor.exit();
});
