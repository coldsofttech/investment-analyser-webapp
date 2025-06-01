class Ticker {
    constructor(ticker, stocksOwned = null, avgPrice = null) {
        this.tickerCode = ticker;
        this.stocksOwned = stocksOwned;
        this.avgPrice = avgPrice;
        this.error = null;
        this.api = null;
        this.companyInfo = null;
    }

    async init() {
        try {
            const { apiConfig, apiHeaders } = await this._getCloudflareConfig();
            this.api = {
                config: apiConfig,
                headers: apiHeaders
            };

            this.companyInfo = await this._getCompanyInformation();
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
}