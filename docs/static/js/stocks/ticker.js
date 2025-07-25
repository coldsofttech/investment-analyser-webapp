async function calculateStocksOwned(pieAmount, allocPercent, avgPrice, closePrice) {
    const priceToUse = (avgPrice !== null && avgPrice !== undefined && avgPrice > 0) ? avgPrice : closePrice;
    if (!priceToUse || priceToUse <= 0) {
        throw new Error('Valid price (avgPrice or closePrice) must be provided.');
    }

    if (!pieAmount || pieAmount <= 0) {
        throw new Error('Valid pieAmount must be provided.');
    }

    if (allocPercent === undefined || allocPercent < 0) {
        throw new Error('Allocation % must be non-negative.');
    }

    const amountAllocated = pieAmount * (allocPercent / 100);
    const stocksOwned = amountAllocated / priceToUse;
    return stocksOwned.toFixed(6);
}

let allTickerInstance = null;
async function getAllTickerInstance() {
    if (allTickerInstance) {
        return allTickerInstance;
    }

    const marketCapBucket = (val) => {
        if (val < 300000000) {
            return 'Micro (< $300M)';
        } else if (val >= 300000000 && val < 2000000000) {
            return 'Small ($300M - $2B)';
        } else if (val >= 2000000000 && val < 10000000000) {
            return 'Mid ($2B - $10B)';
        } else if (val >= 10000000000 && val < 200000000000) {
            return 'Large ($10B - $200B)';
        } else if (val >= 200000000000) {
            return 'Mega (> $200B)';
        } else {
            return 'Unknown';
        }
    }
    const betaBucket = (val) => {
        if (val < 0.8) {
            return 'Low (< 0.8)';
        } else if (val >= 0.8 && val < 1.2) {
            return 'Neutral (0.8 - 1.2)';
        } else if (val >= 1.2) {
            return 'High (> 1.2)';
        } else {
            return 'Unknown';
        }
    }
    const volatilityBucket = (val) => {
        if (val < 0.15) {
            return 'Low (< 0.15)';
        } else if (val >= 0.15 && val < 0.30) {
            return 'Medium (0.15 - 0.30)';
        } else if (val >= 0.30) {
            return 'High (> 0.30)';
        } else {
            return 'Unknown';
        }
    }

    try {
        allTickerInstance = new AllTickers();
        await allTickerInstance.init();

        if (allTickerInstance.error) {
            console.warn(`Error loading tickers: ${allTickerInstance.error.message}`);
        }

        allTickerInstance.tickers.forEach(t => {
            t.marketCapBucket = marketCapBucket(t?.marketCap);
            t.betaBucket = betaBucket(t?.beta);
            t.volatilityBucket = volatilityBucket(t?.volatility);
        });
    } catch (err) {
        console.warn(`Error loading tickers: ${err.message}`);
    }

    return allTickerInstance;
}

async function getCloudflareConfig() {
    try {
        const response = await fetch(`${getRootPath()}/static/js/cf-config.json`);
        if (!response.ok) {
            throw new Error(`Failed to load Cloudflare config (status ${response.status}).`);
        }

        const apiConfig = await response.json();
        if (!apiConfig || !apiConfig.token || !apiConfig.domain) {
            throw new Error('Invalid Cloudflare config file structure.');
        }

        const apiHeaders = {
            'Authorization': `Bearer ${apiConfig.token}`,
            'Content-Type': 'application/json'
        };

        return { apiConfig, apiHeaders };
    } catch (err) {
        throw new Error(`Cloudflare config error: ${err.message}`);
    }
}

class Ticker {
    constructor(ticker, defaultCurrency, stocksOwned = null, avgPrice = null) {
        this.tickerCode = ticker;
        this.defaultCurrency = defaultCurrency;
        this.stocksOwned = stocksOwned;
        this.avgPrice = avgPrice;
        this.error = null;
        this.api = null;
        this.companyInfo = null;
        this.priceInfo = null;
        this.fxRate = null;
        this.dividends = null;
        this.events = null;
        this.stockData = null;
        this.etfHoldings = null;
    }

    async init() {
        try {
            const { apiConfig, apiHeaders } = await getCloudflareConfig();
            this.api = {
                config: apiConfig,
                headers: apiHeaders
            };

            this.companyInfo = await this._getCompanyInformation();
            this.priceInfo = await this._getPriceInformation();
            this.fxRate = await this._getFXRate();
            this.dividends = await this._getDividends();
            this.events = await this._getEvents();
            this.stockData = await this._getLineChartData();
            this.etfHoldings = await this._getETFHoldings();
            this.error = null;
        } catch(err) {
            this.error = {
                message: err.message || 'Unknown error',
                stage: 'init',
                ticker: this.tickerCode
            };
        }
    }

    async _getCompanyInformation() {
        try {
            const url = `${this.api?.config?.domain}/tickers/${this.tickerCode}?fields=info`;
            const data = await fetchWithCache(url, this.api?.headers);

            return data.info;
        } catch (err) {
            throw new Error(`Company info fetch failed: ${err.message}`);
        }
    }

    async _getPriceInformation() {
        try {
            const url = `${this.api?.config?.domain}/tickers/${this.tickerCode}?fields=priceInfo`;
            const data = await fetchWithCache(url, this.api?.headers);

            return data.priceInfo;
        } catch (err) {
            throw new Error(`Price info fetch failed: ${err.message}`);
        }
    }

    async _getDividends() {
        try {
            const url = `${this.api?.config?.domain}/tickers/${this.tickerCode}?fields=dividends`;
            const data = await fetchWithCache(url, this.api?.headers);

            return data.dividends;
        } catch (err) {
            throw new Error(`Dividends fetch failed: ${err.message}`);
        }
    }

    async _getEvents() {
        try {
            const url = `${this.api?.config?.domain}/tickers/${this.tickerCode}?fields=events`;
            const data = await fetchWithCache(url, this.api?.headers);

            return data.events;
        } catch (err) {
            throw new Error(`Events fetch failed: ${err.message}`);
        }
    }

    async _getFXRate() {
        try {
            const url = `${this.api?.config?.domain}/fxrates/${this.companyInfo?.currency}${this.defaultCurrency.currency}?fields=conversionRate`;
            const data = await fetchWithCache(url, this.api?.headers);

            return data.conversionRate;
        } catch (err) {
            throw new Error(`FX Rate fetch failed: ${err.message}`);
        }
    }

    async _getLineChartData() {
        try {
            const url = `${this.api?.config?.domain}/tickers/${this.tickerCode}?fields=data`;
            const data = await fetchWithCache(url, this.api?.headers);

            return data.data;
        } catch (err) {
            throw new Error(`Line chart info fetch failed: ${err.message}`);
        }
    }

    async _getETFHoldings() {
        try {
            if (!this.companyInfo?.type === "ETF") {
                return null;
            }

            const url = `${this.api?.config?.domain}/tickers/${this.tickerCode}?fields=holdings`;
            const data = await fetchWithCache(url, this.api?.headers);

            return data.holdings;
        } catch (err) {
            throw new Error(`ETF Holdings fetch failed: ${err.message}`);
        }
    }
}

class AllTickers {
    constructor() {
        this.api = null;
        this.tickers = null;
        this.error = null;
    }

    async init() {
        try {
            const { apiConfig, apiHeaders } = await getCloudflareConfig();
            this.api = {
                config: apiConfig,
                headers: apiHeaders
            };
            this.tickers = await this._getAllTickers();
            this.error = null;
        } catch (err) {
            this.error = {
                message: err.message || 'Unknown error',
                stage: 'init'
            };
        }
    }

    async _getAllTickers() {
        try {
            const url = `${this.api?.config?.domain}/tickers`;
            const data = await fetchWithCache(url, this.api?.headers);

            return data;
        } catch (err) {
            throw new Error(`All tickers fetch failed: ${err.message}`);
        }
    }

    search(query) {
        if (!this.tickers?.length || !query) {
            return [];
        }

        return this.tickers.filter(t => 
            t.ticker.includes(query.toUpperCase())
        );
    }

    isValid(tickerCode) {
        if (!this.tickers?.length || !tickerCode) {
            return false;
        }

        return this.tickers.some(t => t.ticker === tickerCode.toUpperCase());
    }
}