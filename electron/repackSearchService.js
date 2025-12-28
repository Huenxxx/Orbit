import https from 'https';
import http from 'http';
import { URL } from 'url';

// User agent to avoid bot detection
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ==========================================
// FETCH UTILITY
// ==========================================

function fetchPage(url, retries = 2) {
    return new Promise((resolve, reject) => {
        try {
            const parsedUrl = new URL(url);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                headers: {
                    'User-Agent': USER_AGENT,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
                    'Accept-Encoding': 'identity',
                    'Connection': 'keep-alive'
                },
                timeout: 15000
            };

            const req = protocol.request(options, (res) => {
                let data = '';

                // Follow redirects
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let redirectUrl = res.headers.location;
                    if (redirectUrl.startsWith('/')) {
                        redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
                    } else if (!redirectUrl.startsWith('http')) {
                        redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/${redirectUrl}`;
                    }
                    return fetchPage(redirectUrl, retries).then(resolve).catch(reject);
                }

                // Handle errors
                if (res.statusCode !== 200) {
                    if (retries > 0) {
                        setTimeout(() => {
                            fetchPage(url, retries - 1).then(resolve).catch(reject);
                        }, 1000);
                        return;
                    }
                    resolve('');
                    return;
                }

                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
                res.on('error', reject);
            });

            req.on('error', (err) => {
                if (retries > 0) {
                    setTimeout(() => {
                        fetchPage(url, retries - 1).then(resolve).catch(reject);
                    }, 1000);
                } else {
                    reject(err);
                }
            });

            req.on('timeout', () => {
                req.destroy();
                if (retries > 0) {
                    fetchPage(url, retries - 1).then(resolve).catch(reject);
                } else {
                    reject(new Error('Timeout'));
                }
            });

            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ==========================================
// FITGIRL REPACKS
// ==========================================

async function searchFitGirl(query) {
    try {
        const searchUrl = `https://fitgirl-repacks.site/?s=${encodeURIComponent(query)}`;
        console.log('FitGirl: Searching:', searchUrl);

        const html = await fetchPage(searchUrl);
        if (!html) return [];

        const results = [];

        // Match article entries
        const articleRegex = /<article[^>]*>[\s\S]*?<h1[^>]*class="entry-title"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/article>/gi;
        let match;

        while ((match = articleRegex.exec(html)) !== null && results.length < 10) {
            const postUrl = match[1];
            const title = match[2].trim();

            // Skip non-game posts
            if (title.toLowerCase().includes('site update') ||
                title.toLowerCase().includes('weekly') ||
                !postUrl.includes('fitgirl-repacks.site')) {
                continue;
            }

            // Try to extract size from the entry
            const entryHtml = match[0];
            const sizeMatch = entryHtml.match(/(?:Repack Size|Size)[:\s]*([^<\n]+)/i) ||
                entryHtml.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
            const size = sizeMatch ? sizeMatch[1].trim() : 'Desconocido';

            results.push({
                id: `fitgirl_${Date.now()}_${results.length}`,
                name: title,
                postUrl: postUrl,
                size: size,
                source: 'FitGirl',
                magnetUri: null
            });
        }

        console.log(`FitGirl: Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('Error searching FitGirl:', error.message);
        return [];
    }
}

async function extractFitGirlMagnet(postUrl) {
    try {
        console.log('FitGirl: Fetching post:', postUrl);
        const html = await fetchPage(postUrl);
        if (!html) return null;

        // Look for magnet link in the page
        const magnetRegex = /magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*/gi;
        const matches = html.match(magnetRegex);

        if (matches && matches.length > 0) {
            // Return the first (main) magnet link
            const magnet = matches[0].replace(/&amp;/g, '&');
            console.log('FitGirl: Found magnet link');
            return magnet;
        }

        console.log('FitGirl: No magnet found');
        return null;
    } catch (error) {
        console.error('Error extracting FitGirl magnet:', error.message);
        return null;
    }
}

// ==========================================
// DODI REPACKS
// ==========================================

async function searchDODI(query) {
    try {
        const searchUrl = `https://dodi-repacks.site/?s=${encodeURIComponent(query)}`;
        console.log('DODI: Searching:', searchUrl);

        const html = await fetchPage(searchUrl);
        if (!html) return [];

        const results = [];

        // Match article entries - DODI uses similar structure to FitGirl
        const articleRegex = /<article[^>]*>[\s\S]*?<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/article>/gi;
        let match;

        while ((match = articleRegex.exec(html)) !== null && results.length < 10) {
            const postUrl = match[1];
            const title = match[2].trim();

            if (!postUrl.includes('dodi-repacks')) continue;

            results.push({
                id: `dodi_${Date.now()}_${results.length}`,
                name: title,
                postUrl: postUrl,
                size: 'Desconocido',
                source: 'DODI',
                magnetUri: null
            });
        }

        // Alternative pattern for DODI
        if (results.length === 0) {
            const altRegex = /<a[^>]*href="(https:\/\/dodi-repacks\.site\/[^"]+)"[^>]*>([^<]*(?:repack|game)[^<]*)<\/a>/gi;
            while ((match = altRegex.exec(html)) !== null && results.length < 10) {
                results.push({
                    id: `dodi_${Date.now()}_${results.length}`,
                    name: match[2].trim(),
                    postUrl: match[1],
                    size: 'Desconocido',
                    source: 'DODI',
                    magnetUri: null
                });
            }
        }

        console.log(`DODI: Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('Error searching DODI:', error.message);
        return [];
    }
}

async function extractDODIMagnet(postUrl) {
    try {
        console.log('DODI: Fetching post:', postUrl);
        const html = await fetchPage(postUrl);
        if (!html) return null;

        // Look for magnet link
        const magnetRegex = /magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*/gi;
        const matches = html.match(magnetRegex);

        if (matches && matches.length > 0) {
            const magnet = matches[0].replace(/&amp;/g, '&');
            console.log('DODI: Found magnet link');
            return magnet;
        }

        console.log('DODI: No magnet found');
        return null;
    } catch (error) {
        console.error('Error extracting DODI magnet:', error.message);
        return null;
    }
}

// ==========================================
// ELAMIGOS (via Archive.org mirrors)
// ==========================================

async function searchElAmigos(query) {
    try {
        // ElAmigos doesn't have a public search, so we search via Google-like pattern
        // or use common archive mirrors. For now, we'll search the main site.
        const searchUrl = `https://elamigos.site/?s=${encodeURIComponent(query)}`;
        console.log('ElAmigos: Searching:', searchUrl);

        const html = await fetchPage(searchUrl);
        if (!html) return [];

        const results = [];

        // Match entries
        const entryRegex = /<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match;

        while ((match = entryRegex.exec(html)) !== null && results.length < 10) {
            const postUrl = match[1];
            const title = match[2].trim();

            results.push({
                id: `elamigos_${Date.now()}_${results.length}`,
                name: title,
                postUrl: postUrl,
                size: 'Desconocido',
                source: 'ElAmigos',
                magnetUri: null
            });
        }

        console.log(`ElAmigos: Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('Error searching ElAmigos:', error.message);
        return [];
    }
}

async function extractElAmigosMagnet(postUrl) {
    try {
        console.log('ElAmigos: Fetching post:', postUrl);
        const html = await fetchPage(postUrl);
        if (!html) return null;

        // ElAmigos often uses 1fichier, torrent files, or magnet links
        const magnetRegex = /magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*/gi;
        const matches = html.match(magnetRegex);

        if (matches && matches.length > 0) {
            const magnet = matches[0].replace(/&amp;/g, '&');
            console.log('ElAmigos: Found magnet link');
            return magnet;
        }

        // If no direct magnet, look for torrent download links
        const torrentLinkRegex = /href="([^"]*\.torrent[^"]*)"/gi;
        const torrentMatch = torrentLinkRegex.exec(html);
        if (torrentMatch) {
            console.log('ElAmigos: Found torrent file link:', torrentMatch[1]);
            // We can't use .torrent files directly with WebTorrent magnet,
            // return the link for manual download
            return null;
        }

        console.log('ElAmigos: No magnet found');
        return null;
    } catch (error) {
        console.error('Error extracting ElAmigos magnet:', error.message);
        return null;
    }
}

// ==========================================
// MAIN SEARCH FUNCTION
// ==========================================

async function searchRepacks(query) {
    try {
        console.log('Searching repacks for:', query);

        // Search in parallel
        const [fitgirlResults, dodiResults, elamigosResults] = await Promise.allSettled([
            searchFitGirl(query),
            searchDODI(query),
            searchElAmigos(query)
        ]);

        const combined = [];
        const maxPerSource = 5;

        // Process FitGirl results
        if (fitgirlResults.status === 'fulfilled' && fitgirlResults.value) {
            combined.push(...fitgirlResults.value.slice(0, maxPerSource));
        }

        // Process DODI results
        if (dodiResults.status === 'fulfilled' && dodiResults.value) {
            combined.push(...dodiResults.value.slice(0, maxPerSource));
        }

        // Process ElAmigos results
        if (elamigosResults.status === 'fulfilled' && elamigosResults.value) {
            combined.push(...elamigosResults.value.slice(0, maxPerSource));
        }

        console.log(`Total repacks found: ${combined.length}`);
        return combined;
    } catch (error) {
        console.error('Error searching repacks:', error.message);
        return [];
    }
}

// ==========================================
// GET MAGNET LINK
// ==========================================

async function getMagnetLink(source, postUrl) {
    try {
        console.log('Getting magnet from:', source, postUrl);

        const sourceLower = source.toLowerCase();

        if (sourceLower.includes('fitgirl')) {
            return await extractFitGirlMagnet(postUrl);
        } else if (sourceLower.includes('dodi')) {
            return await extractDODIMagnet(postUrl);
        } else if (sourceLower.includes('elamigos') || sourceLower.includes('amigos')) {
            return await extractElAmigosMagnet(postUrl);
        }

        // Generic: try to find magnet on the page
        const html = await fetchPage(postUrl);
        if (html) {
            const magnetRegex = /magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^"'\s<]*/i;
            const match = html.match(magnetRegex);
            if (match) {
                return match[0].replace(/&amp;/g, '&');
            }
        }

        return null;
    } catch (error) {
        console.error('Error getting magnet link:', error.message);
        return null;
    }
}

// ==========================================
// EXPORTS
// ==========================================

export const repackSearchService = {
    searchRepacks,
    getMagnetLink
};
