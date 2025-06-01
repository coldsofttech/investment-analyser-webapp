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
    constructor(info, data, dividends, fxRate) {
        this.info = info;
        this.data = data;
        this.dividends = dividends;
        this.fxRate = fxRate;
        this.historicalPerformance = this.getHistoricalPerformance();
        this.futureForecast = null;
        this.recommendations = null;
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
}