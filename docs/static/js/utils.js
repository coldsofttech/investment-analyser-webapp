function getRootPath() {
    const rootFolder = window.location.pathname.split('/')[1];
    return rootFolder ? `/${rootFolder}/` : '/';
}

async function formatCurrency(value, defaultCurrency, fullSymbol = false) {
    const suffixes = ['', 'k', 'm', 'b', 't'];
    let magnitude = 0;

    while (Math.abs(value) >= 1000 && magnitude < suffixes.length - 1) {
        magnitude++;
        value /= 1000.0;
    }

    const formatted = Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return fullSymbol
        ? `${formatted}${suffixes[magnitude]} ${defaultCurrency.currency}`
        : `${defaultCurrency.symbol} ${formatted}${suffixes[magnitude]}`;
}

async function formatPercentage(value) {
    if (isNaN(value)) return null;

    return Number(value)
        .toLocaleString('en-GB', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        }) + ' %';
}

async function truncWebsite(domain) {
    return domain.replace(/^https?:\/\/(www\.)?/, '');
}

async function loadError() {
    const urlParams = new URLSearchParams(window.location.search);
    const msg = urlParams.get('error');

    if (msg && msg !== null && msg !== undefined) {
        return displayError(decodeURIComponent(msg));
    } else {
        return removeError();
    }
}

async function removeError({
    errorContainer = '#errorMessageContainer',
    errorElementId = '#errorMessage'
} = {}) {
    $(errorElementId).hide();
    $(errorContainer).html();
}

async function displayError(message, {
    redirect = false,
    redirectUrl = '',
    source = '',
    errorContainer = '#errorMessageContainer',
    errorElementId = '#errorMessage'
} = {}) {
    if (redirect) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('error', message);

        const queryString = urlParams.toString();
        if (redirectUrl) {
            const finalUrl = redirectUrl.includes('{source}')
                ? redirectUrl.replace('{source}', source)
                : redirectUrl;
            const appRootPath = getRootPath();
            
            window.location.href = `${appRootPath}${finalUrl}?${queryString}`;
        } else {
            console.warn('Redirect requested but no redirectUrl provided.');
        }
    } else {
        const $error = $(errorElementId);
        const $container = $(errorContainer);

        if ($error.length) {
            $error.text(message).show();
            $container.show();
        } else {
            $container.html(`
                <div class="alert alert-danger" role="alert" id="${errorElementId.replace('#', '')}">${message}</div>
            `).show();
        }
    }
}