export function extractPricing(text: string): string | undefined {
    const cleanText = text.toLowerCase().trim();
    
    const pricingKeywords = [
        'free',
        'freemium',
        'paid',
        'subscription',
        'premium',
        'trial',
        'open source',
        'opensource',
        '$',
        '€',
        '£',
        'price',
        'pricing',
        'per month',
        '/mo',
        'contact',
    ];

    for (const keyword of pricingKeywords) {
        if (cleanText.includes(keyword)) {
            if (cleanText.includes('free') && !cleanText.includes('freemium')) {
                return 'Free';
            }
            if (cleanText.includes('freemium')) {
                return 'Freemium';
            }
            if (cleanText.includes('open source') || cleanText.includes('opensource')) {
                return 'Open Source';
            }
            if (cleanText.includes('$') || cleanText.includes('€') || cleanText.includes('£')) {
                const match = text.match(/[\$€£]\s*\d+/);
                if (match) {
                    return match[0];
                }
                return 'Paid';
            }
            if (cleanText.includes('subscription') || cleanText.includes('premium')) {
                return 'Paid';
            }
            if (cleanText.includes('contact')) {
                return 'Contact for Pricing';
            }
        }
    }

    return undefined;
}

export function extractTagsFromText(text: string): string[] {
    const tags: string[] = [];
    const cleanText = text.toLowerCase();

    const commonTags = [
        'machine learning',
        'nlp',
        'natural language processing',
        'computer vision',
        'image generation',
        'text generation',
        'chatbot',
        'automation',
        'productivity',
        'writing',
        'coding',
        'design',
        'marketing',
        'seo',
        'sales',
        'data analysis',
        'video',
        'audio',
        'translation',
        'summarization',
    ];

    for (const tag of commonTags) {
        if (cleanText.includes(tag)) {
            tags.push(tag.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '));
        }
    }

    return [...new Set(tags)];
}

export function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .replace(/\t+/g, ' ')
        .trim();
}

export function extractUrl(href: string, baseUrl: string): string {
    if (!href) {
        return baseUrl;
    }
    
    if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
    }
    
    if (href.startsWith('//')) {
        return `https:${href}`;
    }
    
    if (href.startsWith('/')) {
        const url = new URL(baseUrl);
        return `${url.protocol}//${url.host}${href}`;
    }
    
    return new URL(href, baseUrl).href;
}

export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
