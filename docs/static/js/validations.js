async function validateTicker(
    selector,
    dropdown = '#tickerSuggestions',
    { onValid = null, onInvalid = null } = {}
) {
    const $ticker = $(selector);
    const $dropdown = $(dropdown);
    let selectedIndex = -1;
    const allTickerInstance = await getAllTickerInstance();
    const renderDropdown = (matches, input) => {
        $dropdown.html('');
        selectedIndex = -1;

        matches.forEach((t, i) => {
            const $item = $('<div class="dropdown-item"></div>').text(t?.ticker);
            $item.attr('data-index', i);
            $dropdown.append($item);
        });

        $dropdown.css({ display: 'block' }).show();
    }
    const updateHighlight = () => {
        $dropdown.children().removeClass('active');
        if (selectedIndex >= 0) {
            $dropdown.children().eq(selectedIndex).addClass('active');
        }
    };

    $ticker.on('input', function() {
        const value = $(this).val().toUpperCase();
        const cleaned = value.replace(/[^A-Z0-9.]/g, '');
        $(this).val(cleaned);

        if (!cleaned) {
            $dropdown.hide();
            return;
        }

        const matches = allTickerInstance?.search(cleaned);
        if (!matches.length) {
            $dropdown.hide();
            return;
        }

        renderDropdown(matches.slice(0, 10), this);
    });

    $ticker.on('blur', function() {
        setTimeout(() => {
            $dropdown.hide();

            const value = $(this).val().toUpperCase();
            if (!value) {
                return;
            }

            if (allTickerInstance?.isValid(value)) {
                if (typeof onValid === 'function') {
                    onValid(value);
                }
            } else {
                if (typeof onInvalid === 'function') {
                    onInvalid(value);
                    $(this).val('');
                }
            }
        }, 200);
    });

    $ticker.on('keydown', function(e) {
        const items = $dropdown.children();
        if (!items.length || !$dropdown.is(':visible')) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            updateHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            updateHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0) {
                const value = $(items[selectedIndex]).text();
                $ticker.val(value);
                $dropdown.hide();
                if (typeof onValid === 'function') {
                    onValid(true);
                }
            }
        }
    });

    $dropdown.on('mousedown', '.dropdown-item', function() {
        const value = $(this).text();
        $ticker.val(value);
        $dropdown.hide();
        
        if (typeof onValid === 'function') {
            onValid(value);
        }
    });
}