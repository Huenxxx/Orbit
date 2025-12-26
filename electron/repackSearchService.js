import https from 'https';
import http from 'http';
import { URL } from 'url';

// User agent to avoid bot detection - using latest Chrome
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Fetch HTML from URL with better headers
function fetchPage(url, retries = 2) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
                'Accept-Encoding': 'identity',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Referer': `https://${parsedUrl.hostname}/`
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
                }
                return fetchPage(redirectUrl, retries).then(resolve).catch(reject);
            }

            if (res.statusCode !== 200) {
                if (retries > 0) {
                    // Retry after a delay
                    setTimeout(() => {
                        fetchPage(url, retries - 1).then(resolve).catch(reject);
                    }, 1000);
                    return;
                }
                reject(new Error(`HTTP ${res.statusCode}`));
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
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Extract magnet link from FitGirl Repacks post page
async function extractFitGirlMagnet(postUrl) {
    try {
        console.log('FitGirl: Fetching post page:', postUrl);
        const html = await fetchPage(postUrl);
        console.log('FitGirl: Page fetched, length:', html.length);

        // FitGirl uses various formats for magnet links
        const patterns = [
            // Standard href with quotes
            /href="(magnet:\?xt=urn:btih:[^"]+)"/i,
            /href='(magnet:\?xt=urn:btih:[^']+)'/i,
            // Markdown style: [magnet](magnet:...)
            /\[magnet\]\((magnet:\?xt=urn:btih:[^)]+)\)/i,
            // href with parentheses (markdown links in HTML)
            /href=\((magnet:\?xt=urn:btih:[^)]+)\)/i,
            // Generic magnet link in page
            /(magnet:\?xt=urn:btih:[A-Fa-f0-9]{40}[^"'\s<>)]*)/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                console.log('FitGirl: Found magnet link');
                let magnet = match[1].replace(/&amp;/g, '&');
                // Don't decode if it's already decoded
                if (magnet.includes('%')) {
                    try {
                        magnet = decodeURIComponent(magnet);
                    } catch (e) {
                        // Already decoded or invalid encoding
                    }
                }
                return magnet;
            }
        }

        console.log('FitGirl: No magnet found in page');
        return null;
    } catch (error) {
        console.error('Error extracting FitGirl magnet:', error.message);
        return null;
    }
}

// Search FitGirl Repacks
async function searchFitGirl(query) {
    try {
        // Clean the query - remove special characters that might cause issues
        const cleanQuery = query.replace(/['"]/g, '').trim();
        const searchUrl = `https://fitgirl-repacks.site/?s=${encodeURIComponent(cleanQuery)}`;

        console.log('Searching FitGirl:', searchUrl);
        const html = await fetchPage(searchUrl);

        const results = [];

        // More flexible regex patterns for FitGirl
        // They use h1 with entry-title class
        const patterns = [
            /<article[^>]*>[\s\S]*?<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
            /<h1[^>]*class="entry-title"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
        ];

        let match;
        let count = 0;
        const seen = new Set();

        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            while ((match = pattern.exec(html)) !== null && count < 10) {
                const postUrl = match[1];

                // Skip if already seen
                if (seen.has(postUrl)) continue;
                seen.add(postUrl);

                let title = match[2]
                    .replace(/&#8211;/g, '-')
                    .replace(/&#8217;/g, "'")
                    .replace(/&#8220;/g, '"')
                    .replace(/&#8221;/g, '"')
                    .replace(/&amp;/g, '&')
                    .trim();

                // Skip updates, changelogs, site news
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('changelog') ||
                    lowerTitle.includes('site news') ||
                    lowerTitle.includes('updates page') ||
                    (lowerTitle.includes('update') && !lowerTitle.includes(cleanQuery.toLowerCase()))) {
                    continue;
                }

                // Extract size from title
                const sizeMatch = title.match(/\[?\(?\s*(\d+(?:\.\d+)?\s*(?:GB|MB|TB))\s*\)?\]?/i);
                const size = sizeMatch ? sizeMatch[1] : 'Ver página';

                results.push({
                    id: `fitgirl_${count}`,
                    name: title,
                    size: size,
                    source: 'FitGirl Repacks',
                    postUrl: postUrl,
                    magnetUri: null
                });

                count++;
            }
        }

        console.log(`FitGirl: Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('Error searching FitGirl:', error.message);
        return [];
    }
}

// Search DODI Repacks
async function searchDODI(query) {
    try {
        const cleanQuery = query.replace(/['"]/g, '').trim();
        const searchUrl = `https://dodi-repacks.site/?s=${encodeURIComponent(cleanQuery)}`;

        console.log('Searching DODI:', searchUrl);
        const html = await fetchPage(searchUrl);

        const results = [];

        // Multiple patterns for DODI
        const patterns = [
            /<article[^>]*>[\s\S]*?<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
            /<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi
        ];

        let match;
        let count = 0;
        const seen = new Set();

        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            while ((match = pattern.exec(html)) !== null && count < 10) {
                const postUrl = match[1];

                if (seen.has(postUrl)) continue;
                seen.add(postUrl);

                let title = match[2]
                    .replace(/&#8211;/g, '-')
                    .replace(/&#8217;/g, "'")
                    .replace(/&#8220;/g, '"')
                    .replace(/&#8221;/g, '"')
                    .replace(/&amp;/g, '&')
                    .trim();

                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('update only') && !lowerTitle.includes(cleanQuery.toLowerCase())) {
                    continue;
                }

                const sizeMatch = title.match(/\[?\(?\s*(\d+(?:\.\d+)?\s*(?:GB|MB|TB))\s*\)?\]?/i);
                const size = sizeMatch ? sizeMatch[1] : 'Ver página';

                results.push({
                    id: `dodi_${count}`,
                    name: title,
                    size: size,
                    source: 'DODI Repacks',
                    postUrl: postUrl,
                    magnetUri: null
                });

                count++;
            }
        }

        console.log(`DODI: Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('Error searching DODI:', error.message);
        return [];
    }
}

// Extract magnet from DODI post
async function extractDODIMagnet(postUrl) {
    try {
        const html = await fetchPage(postUrl);

        const patterns = [
            /href="(magnet:\?xt=urn:btih:[^"]+)"/i,
            /href='(magnet:\?xt=urn:btih:[^']+)'/i,
            /(magnet:\?xt=urn:btih:[a-zA-Z0-9&=%.+-]+)/i
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                return decodeURIComponent(match[1].replace(/&amp;/g, '&'));
            }
        }

        return null;
    } catch (error) {
        console.error('Error extracting DODI magnet:', error.message);
        return null;
    }
}

// Search PiviGames - they use obfuscated titles and short URL IDs
async function searchPiviGames(query) {
    try {
        // PiviGames uses obfuscated search, we need to be flexible
        const cleanQuery = query.replace(/['"]/g, '').trim();
        // Take first word or two for better matching (they often match partial names)
        const searchTerm = cleanQuery.split(' ').slice(0, 2).join(' ');
        const searchUrl = `https://pivigames.blog/?s=${encodeURIComponent(searchTerm)}`;

        console.log('Searching PiviGames:', searchUrl);
        const html = await fetchPage(searchUrl);

        const results = [];

        // PiviGames structure - look for article links with specific patterns
        // They use various title structures:
        // - entry-title class
        // - Direct links to game posts
        // The titles often have "PC EN ESPAÑOL" and "4" replacing "A" in game names

        const patterns = [
            // Main pattern for search results - h2 with entry-title
            /<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
            // Alternate: any h2 with link
            /<h2[^>]*>\s*<a[^>]*href="(https:\/\/pivigames\.blog\/[^"]+)"[^>]*>([^<]+)<\/a>/gi,
            // Article card pattern
            /<article[^>]*>[\s\S]*?<a[^>]*href="(https:\/\/pivigames\.blog\/[^"]+)"[^>]*title="([^"]+)"/gi
        ];

        let count = 0;
        const seen = new Set();

        for (const pattern of patterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(html)) !== null && count < 10) {
                const postUrl = match[1];

                // Skip non-game pages
                if (postUrl.includes('como-') ||
                    postUrl.includes('programas-') ||
                    postUrl.includes('top-') ||
                    postUrl.includes('mejores-juegos')) {
                    continue;
                }

                if (seen.has(postUrl)) continue;
                seen.add(postUrl);

                let title = match[2]
                    .replace(/&#8211;/g, '-')
                    .replace(/&#8217;/g, "'")
                    .replace(/&#8220;/g, '"')
                    .replace(/&#8221;/g, '"')
                    .replace(/&amp;/g, '&')
                    .replace(/▷/g, '')
                    .trim();

                // Deobfuscate common patterns (PiviGames replaces letters)
                // They use 4 for A, 3 for E, 1 for I, 0 for O, etc.
                const deobfuscatedTitle = title
                    .replace(/G4T3/gi, 'GATE')
                    .replace(/4/g, 'A')  // Be careful with version numbers
                    .replace(/3(\s)/g, 'E$1');

                // Skip unwanted content
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('top ') ||
                    lowerTitle.includes('mejores juegos') ||
                    lowerTitle.includes('gratis en epic') ||
                    lowerTitle.includes('ofertas') ||
                    lowerTitle.includes('suscripcion')) {
                    continue;
                }

                // Extract size from title if present
                const sizeMatch = title.match(/(\d+(?:\.\d+)?\s*(?:GB|MB|TB))/i);
                const size = sizeMatch ? sizeMatch[1] : 'Ver página';

                results.push({
                    id: `pivigames_${count}`,
                    name: title,
                    size: size,
                    source: 'PiviGames',
                    postUrl: postUrl,
                    magnetUri: null
                });

                count++;
            }
            if (count > 0) break; // Use first pattern that works
        }

        console.log(`PiviGames: Found ${results.length} results`);
        return results;
    } catch (error) {
        console.error('Error searching PiviGames:', error.message);
        return [];
    }
}

// Extract magnet from PiviGames post (follows to PlayPaste or similar)
async function extractPiviGamesMagnet(postUrl) {
    try {
        console.log('PiviGames: Fetching post page:', postUrl);
        const html = await fetchPage(postUrl);

        // Magnet patterns
        const magnetPatterns = [
            /href="(magnet:\?xt=urn:btih:[^"]+)"/i,
            /href='(magnet:\?xt=urn:btih:[^']+)'/i,
            /(magnet:\?xt=urn:btih:[a-zA-Z0-9&=%.+-]+)/i
        ];

        // First check if there's a direct magnet link
        for (const pattern of magnetPatterns) {
            const match = html.match(pattern);
            if (match) {
                console.log('PiviGames: Found direct magnet link');
                return decodeURIComponent(match[1].replace(/&amp;/g, '&'));
            }
        }

        // PiviGames uses buttons like "VER ENLACE TORRENT" that go to paste/redirect sites
        // Look for the green torrent button specifically - it has class "btn" and contains torrent text
        const torrentButtonPatterns = [
            // Green torrent button - look for href with any domain after Torrent text
            /<a[^>]*href="([^"]+)"[^>]*class="[^"]*(?:btn|button)[^"]*"[^>]*>(?:<[^>]*>)*\s*VER\s+ENLACE\s+TORRENT/gi,
            // Alternative: any link with torrent button text
            /<a[^>]*href="([^"]+)"[^>]*>(?:<[^>]*>)*\s*VER\s+ENLACE\s+TORRENT(?:<[^>]*>)*\s*<\/a>/gi,
            // Look for link after "Torrent" text
            /Torrent[\s\S]{0,200}?<a[^>]*href="([^"]+)"[^>]*class="[^"]*btn/gi,
            // Any button with TORRENT in it
            /<a[^>]*href="([^"]+)"[^>]*>[^<]*TORRENT[^<]*<\/a>/gi
        ];

        let torrentUrl = null;
        for (const pattern of torrentButtonPatterns) {
            pattern.lastIndex = 0;
            const match = pattern.exec(html);
            if (match && match[1]) {
                torrentUrl = match[1];
                console.log('PiviGames: Found torrent button URL:', torrentUrl);
                break;
            }
        }

        if (!torrentUrl) {
            // Try to find any paste site link
            const pastePatterns = [
                /href="(https?:\/\/(?:playpaste\.com|paste\.ee|controlc\.com|textbin\.net|rentry\.co|pastemytxt\.com)[^"]+)"/gi,
                /href="(https?:\/\/[^"]*paste[^"]+)"/gi
            ];

            for (const pattern of pastePatterns) {
                pattern.lastIndex = 0;
                const match = pattern.exec(html);
                if (match && match[1]) {
                    torrentUrl = match[1];
                    console.log('PiviGames: Found paste URL:', torrentUrl);
                    break;
                }
            }
        }

        if (torrentUrl) {
            // Fetch the paste/redirect page
            try {
                console.log('PiviGames: Fetching torrent link page...');
                const pasteHtml = await fetchPage(torrentUrl);

                // Look for magnet link in the paste
                for (const pattern of magnetPatterns) {
                    const match = pasteHtml.match(pattern);
                    if (match) {
                        console.log('PiviGames: Found magnet in paste');
                        return decodeURIComponent(match[1].replace(/&amp;/g, '&'));
                    }
                }

                // Sometimes the magnet is in plain text
                const plainMagnetMatch = pasteHtml.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^\s"'<\])]*/i);
                if (plainMagnetMatch) {
                    console.log('PiviGames: Found plain magnet in paste');
                    return decodeURIComponent(plainMagnetMatch[0].replace(/&amp;/g, '&'));
                }

                // Check if this is a shortener that has another redirect
                const redirectMatch = pasteHtml.match(/href="(https?:\/\/[^"]*(?:magnet|torrent|paste)[^"]*)"/i);
                if (redirectMatch) {
                    console.log('PiviGames: Following redirect:', redirectMatch[1]);
                    try {
                        const finalHtml = await fetchPage(redirectMatch[1]);
                        const finalMagnetMatch = finalHtml.match(/magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^\s"'<\])]*}/i);
                        if (finalMagnetMatch) {
                            return decodeURIComponent(finalMagnetMatch[0].replace(/&amp;/g, '&'));
                        }
                    } catch (e) {
                        console.error('PiviGames: Error following redirect:', e.message);
                    }
                }
            } catch (pasteError) {
                console.error('PiviGames: Error fetching paste:', pasteError.message);
            }
        }

        console.log('PiviGames: No magnet found');
        return null;
    } catch (error) {
        console.error('Error extracting PiviGames magnet:', error.message);
        return null;
    }
}

// Combined search across all sources
async function searchRepacks(query) {
    try {
        console.log('Searching repacks for:', query);

        // Search in parallel with timeout
        const results = await Promise.allSettled([
            searchFitGirl(query),
            searchDODI(query),
            searchPiviGames(query)
        ]);

        const combined = [];
        const maxPerSource = 5;

        // Process FitGirl results
        if (results[0].status === 'fulfilled') {
            combined.push(...results[0].value.slice(0, maxPerSource));
        }

        // Process DODI results
        if (results[1].status === 'fulfilled') {
            combined.push(...results[1].value.slice(0, maxPerSource));
        }

        // Process PiviGames results
        if (results[2].status === 'fulfilled') {
            combined.push(...results[2].value.slice(0, maxPerSource));
        }

        console.log(`Total repacks found: ${combined.length}`);
        return combined;
    } catch (error) {
        console.error('Error searching repacks:', error.message);
        return [];
    }
}

// Get magnet link for a specific repack
async function getMagnetLink(source, postUrl) {
    try {
        console.log('Getting magnet from:', source, postUrl);

        if (source.toLowerCase().includes('fitgirl')) {
            return await extractFitGirlMagnet(postUrl);
        } else if (source.toLowerCase().includes('dodi')) {
            return await extractDODIMagnet(postUrl);
        } else if (source.toLowerCase().includes('pivi')) {
            return await extractPiviGamesMagnet(postUrl);
        }
        return null;
    } catch (error) {
        console.error('Error getting magnet link:', error.message);
        return null;
    }
}

export const repackSearchService = {
    searchRepacks,
    searchFitGirl,
    searchDODI,
    searchPiviGames,
    getMagnetLink
};

