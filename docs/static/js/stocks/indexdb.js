const CACHE_DB_NAME = 'InvestmentAnalyserStocksCacheDB';
const CACHE_DB_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL

function openCacheDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains('tickers')) {
                db.createObjectStore('tickers', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('fxrates')) {
                db.createObjectStore('fxrates', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('analysis')) {
                db.createObjectStore('analysis', { keyPath: 'key' });
            }
        };
    });
}

async function getCachedData(storeName, key) {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => {
            const record = req.result;
            if (!record) {
                resolve(null);
                return;
            }

            if (Date.now() - record.timestamp > CACHE_TTL_MS) {
                resolve(null);
                return;
            }

            resolve(record.data);
        };
        req.onerror = () => reject(req.error);
    });
}

async function setCachedData(storeName, key, data) {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const record = {
            key, 
            data, 
            timestamp: Date.now()
        };
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function getCacheKey(requestUrl) {
    const url = new URL(requestUrl);
    const pathname = url.pathname;
    const params = new URLSearchParams(url.search);
    const sortedParams = new URLSearchParams([...params.entries()].sort());

    return pathname + (sortedParams.toString() ? '?' + sortedParams.toString() : '');
}

function getStoreNameFromUrl(requestUrl) {
    const url = new URL(requestUrl);
    const firstSegment = url.pathname.split('/').filter(Boolean)[0];

    if (['tickers', 'fxrates', 'analysis'].includes(firstSegment)) {
        return firstSegment;   
    }

    return 'default';
}

async function fetchWithCache(requestUrl, headers) {
    const storeName = getStoreNameFromUrl(requestUrl);

    if (storeName === 'default') {
        const response = await fetch(requestUrl, { headers });
        if (!response.ok) {
            throw new Error(`API error (${response.status}): ${response.statusText}`);
        }

        return response.json();
    }

    const cacheKey = getCacheKey(requestUrl);
    const cached = await getCachedData(storeName, cacheKey);
    if (cached) {
        return cached;
    }

    const response = await fetch(requestUrl, { headers });
    if (!response.ok) {
        throw new Error(`API error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    await setCachedData(storeName, cacheKey, data);

    return data;
}