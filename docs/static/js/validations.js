async function validateTicker(selector) {
    const $ticker = $(selector);

    $ticker.on('input', function() {
        const value = $(this).val().toUpperCase();
        const cleaned = value.replace(/[^A-Z0-9.]/g, '');
        $(this).val(cleaned);
    });
}