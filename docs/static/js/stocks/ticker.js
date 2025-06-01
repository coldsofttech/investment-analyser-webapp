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
    }

    async init() {
        try {
            const { apiConfig, apiHeaders } = await this._getCloudflareConfig();
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
            this.error = null;
        } catch(err) {
            this.error = {
                message: err.message || 'Unknown error',
                stage: 'init',
                ticker: this.tickerCode
            };
        }
    }

    async _getCloudflareConfig() {
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
}