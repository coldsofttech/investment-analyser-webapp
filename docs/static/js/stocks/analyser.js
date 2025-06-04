const periods = [
    { index: 0, label: '1 month', months: 1 },
    { index: 1, label: '3 months', months: 3 },
    { index: 2, label: '6 months', months: 6 },
    { index: 3, label: '1 year', months: 12 },
    { index: 4, label: '2 years', months: 24 },
    { index: 5, label: '5 years', months: 60 },
    { index: 6, label: '10 years', months: 120 },
    { index: 7, label: '15 years', months: 180 },
    { index: 8, label: '20 years', months: 240 },
    { index: 9, label: 'Since inception', months: null }
];

const riskProfileClasses = {
    'Low': 'buy',
    'Medium': 'hold',
    'High': 'sell',
    'Very High': 'sell'
};

const riskLevelToScore = (risk) => {
    switch(risk) {
        case 'Low': return 1;
        case 'Medium': return 2;
        case 'High': return 3;
        case 'Very High': return 4;
        default: return 0;
    }
};

const getOverallRiskLabel = (score) => {
    if (score >= 3.5) return 'Very High';
    if (score >= 2.5) return 'High';
    if (score >= 1.5) return 'Medium';
    return 'Low';
};

function classifyRisk (value, thresholds) {
    if (value <= thresholds[0]) {
        return 'Low'
    } else if (value <= thresholds[1]) {
        return 'Medium'
    } else if (value <= thresholds[2]) {
        return 'High'
    } else {
        return 'Very High'
    }
}

class StockAnalyser {
    constructor(info, data, dividends, fxRate, stocksOwned, avgPrice) {
        this.info = info;
        this.data = data;
        this.dividends = dividends;
        this.fxRate = fxRate;
        this.stocksOwned = stocksOwned;
        this.avgPrice = avgPrice;
        this.historicalPerformance = this.getHistoricalPerformance();
        this.futureForecast = this.getFutureForecast();
        this.recommendations = this.getRecommendations();
        this.riskProfile = null;
    }

    #trendlineLinearRegression(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
        const sumX2 = x.reduce((acc, val) => acc + val * val, 0);
        const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const a = (sumY - b * sumX) / n;
        return { a, b };
    }

    getHistoricalPerformance() {
        let records = [];

        for (const period of periods) {
            let growth = null, cagr = null, divCagr = null, trCagr = null, noOfMonths = null;

            const endDate = new Date(this.data?.at(-1).date);
            let startDate = new Date(endDate);

            if (period.months === null) {
                startDate = new Date(this.data?.at(0).date);
                const years = endDate.getFullYear() - startDate.getFullYear();
                const months = endDate.getMonth() - startDate.getMonth();
                noOfMonths = years * 12 + months;
            } else {
                startDate.setMonth(startDate.getMonth() - period.months);
            }

            const sIdx = this.data?.findIndex(d => new Date(d.date) >= startDate);
            const eIdx = this.data?.length - 1;
            let sPrice = null, ePrice = null;

            if (sIdx === -1 || sIdx >= eIdx) {
                growth = null;
                cagr = null;
            } else {
                sPrice = this.data?.at(sIdx).price * this.fxRate;
                ePrice = this.data?.at(eIdx).price * this.fxRate;

                const cagrExp = (period.months !== null ? period.months : noOfMonths) / 12;
                growth = parseFloat(((ePrice - sPrice) / sPrice) * 100);
                cagr = parseFloat((Math.pow((ePrice / sPrice), (1 / cagrExp)) - 1) * 100);
            }

            let divSum = 0, divStart = null, divEnd = null, divDatesInRange = [];

            if (this.dividends?.length > 0) {
                const earliestDate = new Date(this.dividends?.at(0).date);

                if (startDate >= earliestDate || (period.label === '3 months' || period.label === '6 months')) {
                    for (let i = 0; i < this.dividends?.length; i++) {
                        const divDate = new Date(this.dividends?.at(i).date);

                        if (divDate >= startDate && divDate <= endDate) {
                            divDatesInRange.push(this.dividends?.at(i).date);
                            divSum += (this.dividends?.at(i).price * this.fxRate);

                            if (divStart === null) {
                                divStart = this.dividends?.at(i).price * this.fxRate;
                            }

                            divEnd = divSum;
                        }
                    }

                    const divCagrExp = (period.months !== null ? period.months : noOfMonths) / 12;

                    if (divDatesInRange.length >= 1 && divStart > 0 && divCagrExp > 0) {
                        divCagr = parseFloat((Math.pow((divEnd / divStart), (1 / divCagrExp)) - 1) * 100);
                    } else {
                        divCagr = null;
                    }
                } else {
                    divCagr = null;
                }
            }

            const trStartPrice = sPrice !== null ? sPrice : 0.0;
            const trEndPrice = ePrice !== null ? ePrice : 0.0;
            const trDivSum = divSum;
            const trCagrExp = (period.months !== null ? period.months : noOfMonths) / 12;

            if (trStartPrice > 0) {
                trCagr = parseFloat((Math.pow(((trEndPrice + trDivSum) / trStartPrice), (1 / trCagrExp)) - 1) * 100);
            } else {
                trCagr = null;
            }

            records.push({
                index: period.index,
                period: period.label,
                growth: growth,
                cagr: cagr,
                dividendCagr: divCagr,
                totalReturnsCagr: trCagr
            });
        }

        return records;
    }

    getFutureForecast() {
        let records = [];

        for (const period of periods) {
            let forecastPrice = null, growth = null, cagr = null, divCagr = null, trCagr = null, prGrowth = null, trGrowth = null;

            if (period.months !== null) {
                const endDate = new Date(this.data?.at(-1).date);
                const endPrice = this.data?.at(-1).price * this.fxRate;

                let startDate = new Date(endDate);
                startDate.setMonth(startDate.getMonth() - period.months);

                if (period.months < 12) {
                    let sum = 0, count = 0;

                    for (let i = 0; i < this.data?.length; i++) {
                        const currentDate = new Date(this.data?.at(i).date);

                        if (currentDate >= startDate && currentDate <= endDate) {
                            sum += (this.data?.at(i).price * this.fxRate);
                            count++;
                        }
                    }

                    if (count > 0) {
                        forecastPrice = parseFloat(sum / count);
                        growth = parseFloat(((forecastPrice - endPrice) / endPrice) * 100);
                        const cagrExp = (period.months !== null ? period.months : noOfMonths) / 12;
                        cagr = parseFloat((Math.pow((forecastPrice / endPrice), (1 / cagrExp)) - 1) * 100);
                    }

                    const divsInRange = this.dividends
                        .map((item, idx) => ({ date: new Date(item.date), price: item.price * this.fxRate }))
                        .filter(item => item.date >= startDate && item.date <= endDate && item.price > 0);
                    
                    if (divsInRange.length > 0) {
                        const avgDiv = divsInRange.reduce((sum, d) => sum + d.price, 0) / divsInRange.length;
                        const lastDiv = this.dividends?.at(-1).price * this.fxRate;

                        if (avgDiv > 0 && lastDiv > 0) {
                            divCagr = parseFloat(((lastDiv / avgDiv) - 1) * 100);
                        } else {
                            divCagr = null;
                        }
                    }

                    let trStartPrice = endPrice;
                    let trEndPrice = forecastPrice;
                    let trDivSum = 0;
                    const trCagrExp = (period.months !== null ? period.months : noOfMonths) / 12;
                    const totalDivsInRange = this.dividends
                        .map((item, idx) => ({ date: new Date(item.date), price: item.price * this.fxRate }))
                        .filter(item => item.date >= startDate && item.date <= endDate && item.price > 0);
                    
                    if (totalDivsInRange.length > 0) {
                        trDivSum = totalDivsInRange.reduce((sum, d) => sum + d.price, 0);
                    }

                    if (trStartPrice > 0) {
                        trCagr = parseFloat((Math.pow(((trEndPrice + trDivSum) / trStartPrice), (1 / trCagrExp)) - 1) * 100);
                    } else {
                        trCagr = null;
                    }
                } else {
                    let lastPrice = null;

                    const filteredDates = this.data
                        .map((item, idx) => ({ date: new Date(item.date), price: item.price * this.fxRate }))
                        .filter(item => item.date >= startDate && item.date <= endDate);
                    
                    if (filteredDates < 2) {
                        growth = null;
                        forecastPrice = null;
                    } else {
                        const baseDate = filteredDates[0].date;
                        const x = filteredDates.map(item => (item.date - baseDate) / (1000 * 60 * 60 * 24));
                        const y = filteredDates.map(item => item.price);
                        const { a, b } = this.#trendlineLinearRegression(x, y);
                        const daysToForecast = period.months * 30.44;
                        const futureX = x[x.length - 1] + daysToForecast;
                        forecastPrice = parseFloat(a + b * futureX);
                        lastPrice = y[y.length - 1];
                        const ratio = (forecastPrice - lastPrice) / lastPrice;
                        growth = parseFloat(ratio * 100);
                        const cagrExp = (period.months !== null ? period.months : noOfMonths) / 12;
                        cagr = parseFloat((Math.pow((forecastPrice / lastPrice), (1 / cagrExp)) - 1) * 100);
                    }

                    const divsInRange = this.dividends
                        .map((item, idx) => ({ date: new Date(item.date), price: item.price * this.fxRate }))
                        .filter(item => item.date >= startDate && item.date <= endDate && item.price > 0);
                    
                    if (divsInRange.length > 0) {
                        const start = divsInRange[0];
                        const end = divsInRange[divsInRange.length - 1];
                        const years = (end.date - start.date) / (1000 * 60 * 60 * 24 * 365.25);

                        if (years >= 0.5 && start.price > 0) {
                            divCagr = parseFloat(((end.price / start.price) ** (1 / years) - 1) * 100);
                        } else {
                            divCagr = null;
                        }
                    }

                    let trStartPrice = lastPrice;
                    let trEndPrice = forecastPrice;
                    let trDivSum = 0;
                    const trCagrExp = (period.months !== null ? period.months : noOfMonths) / 12;
                    const totalDivsInRange = this.dividends
                        .map((item, idx) => ({ date: new Date(item.date), price: item.priec * this.fxRate }))
                        .filter(item => item.date >= startDate && item.date <= endDate && item.price > 0);
                    
                    if (totalDivsInRange.length > 0) {
                        trDivSum = totalDivsInRange.reduce((sum, d) => sum + d.price, 0);
                    }

                    if (trStartPrice > 0) {
                        trCagr = parseFloat((Math.pow(((trEndPrice + trDivSum) / trStartPrice), (1 / trCagrExp)) - 1) * 100);
                    } else {
                        trCagr = null;
                    }
                }

                prGrowth = parseFloat(((forecastPrice - this.avgPrice) * 100) / this.avgPrice);
                const trForecastPrice = parseFloat((1 + trCagr / 100) * this.avgPrice);
                trGrowth = parseFloat((trForecastPrice - this.avgPrice) * this.stocksOwned);

                records.push({
                    index: period.index,
                    period: period.label,
                    forecastPrice: forecastPrice,
                    growth: growth,
                    cagr: cagr,
                    dividendCagr: divCagr,
                    totalReturnsCagr: trCagr,
                    priceReturnGrowth: prGrowth,
                    totalReturns: trGrowth
                });
            }
        }

        return records;
    }

    getRecommendations() {
        const shortTermCagr = this.historicalPerformance
            .filter(item => ['1 year', '2 years'].includes(item.period))
            .reduce((sum, d) => sum + d.cagr, 0) / 2;
        const longTermCagr = this.historicalPerformance
            .filter(item => ['5 years', '10 years', '15 years', '20 years'].includes(item.period))
            .reduce((sum, d) => sum + d.cagr, 0) / 4;
        const shortTermRecommendation = {
            recommended: shortTermCagr && shortTermCagr >= 7,
            cagr: shortTermCagr ? shortTermCagr : 0.0,
            comments: shortTermCagr ? (
                shortTermCagr >= 7 ? 'Recommended for short-term (1 to 2 years)' : 'Not recommended for short-term (1 to 2 years)'
            ) : null,
            risk: shortTermCagr ? classifyRisk(-shortTermCagr, [-10, -7, -4]) : 'Very High'
        };
        const longTermRecommendation = {
            recommended: longTermCagr && longTermCagr >= 5,
            cagr: longTermCagr ? longTermCagr : 0.0,
            comments: longTermCagr ? (
                longTermCagr >= 5 ? 'Recommended for long-term (5+ years)' : 'Not recommended for long-term (5+ years)'
            ) : null,
            risk: longTermCagr ? classifyRisk(-longTermCagr, [-8, -5, -3]) : 'Very High'
        };

        return {
            shortTerm: shortTermRecommendation,
            longTerm: longTermRecommendation
        };
    }
}