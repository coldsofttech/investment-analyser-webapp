const currencies = [
    { currency: 'GBP', symbol: '£', icon: 'bi-currency-pound' },
    { currency: 'USD', symbol: '$', icon: 'bi-currency-dollar' },
    { currency: 'EUR', symbol: '€', icon: 'bi-currency-euro' },
    { currency: 'INR', symbol: '₹', icon: 'bi-currency-rupee' }
];

function getCurrencies() {
    return currencies;
}

function getCurrency(currency) {
    return getCurrencies().find(c => c.currency === currency) || {
        currency: 'Unknown', symbol: '', icon: 'bi-cash'
    };
}

function defaultCurrency() {
    return getCurrency('GBP');
}

function _addCurrencyIcon(selector, icon) {
    $(selector)
        .removeClass((_, c) => (c.match(/\bbi\S*/g) || []).join(' '))
        .addClass(`bi ${icon}`);
}

async function getDefaultCurrency(
    customCurrency = null,
    customSymbol = null,
    {
        currencySelector = '#defaultCurrency',
        currencyModal = '#defaultCurrencyModal',
        currencySaveButton = '#saveDefaultCurrency',
        currenciesList = '#defaultCurrencyList'
    } = {}
){
    const $selector = $(currencySelector);
    const $modal = $(currencyModal);
    const $saveBtn = $(currencySaveButton);
    const $currencyList = $(currenciesList);
    const getCurrentCurrency = () => {
        const stored = localStorage.getItem('defaultCurrency');
        return stored !== null 
            ? getCurrency(stored)
            : defaultCurrency();
    };
    const updateUI = (currency) => {
        _addCurrencyIcon($selector, currency.icon);
        if (customCurrency) $(customCurrency).text(currency.currency);
        if (customSymbol) _addCurrencyIcon($(customSymbol), currency.icon);
    };

    const currency = getCurrentCurrency();
    localStorage.setItem('defaultCurrency', currency.currency);
    updateUI(currency);

    $selector.on('click', () => {
        const currency = getCurrentCurrency();
        const options = getCurrencies()
            .map(c => `<option value="${c.currency}">${c.currency} (${c.symbol})</option>`)
            .join('');
        $currencyList.html(options).val(currency.currency);
        bootstrap.Modal.getOrCreateInstance($modal[0]).show();
    });

    $saveBtn.on('click', () => {
        const selected = getCurrency($currencyList.val());
        localStorage.setItem('defaultCurrency', selected.currency);
        updateUI(selected);
        bootstrap.Modal.getOrCreateInstance($modal[0]).hide();
    });
}