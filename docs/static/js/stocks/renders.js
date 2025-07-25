const colorPalette = [
    '#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#34495E', '#16A085', '#D35400', '#8E44AD', 
    '#F1C40F', '#D5DBDB', '#27AE60', '#BDC3C7', '#F39C12', '#FF6347', '#DA70D6', '#2E8B57', '#C71585', '#FFD700', 
    '#20B2AA', '#DC143C', '#FF1493', '#FF8C00', '#B8860B', '#556B2F', '#8B008B', '#D2691E', '#A52A2A', '#6A5ACD', 
    '#FF4500', '#E0FFFF', '#B0E0E6', '#ADFF2F', '#FF00FF', '#A9A9A9', '#808000', '#800000', '#B0C4DE', '#C0C0C0', 
    '#000080', '#A52A2A', '#D3D3D3', '#FF6347', '#EE82EE', '#FAFAD2', '#F5FFFA', '#808080', '#F0E68C', '#98FB98', 
    '#FF7F50', '#8B0000', '#800080', '#00FA9A', '#B0E0E6', '#E6E6FA', '#DCDCDC'
];

async function renderLogo(domain, companyName=null) {
    if (domain) {
        return `https://logo.clearbit.com/${domain}`;
    }

    if (companyName) {
        const name = encodeURIComponent(companyName.charAt(0));
        return `https://ui-avatars.com/api/?name=${name}&color=000`;
    }

    return '/static/img/default-logo.png';
}

async function renderDataTableMobileView({
    elementId,
    data,
    columns = [],
    titleFields = [],
    hiddenFields = []
}) {
    let htmlContent = '';
    const parentId = elementId.replace('#', '');

    data.forEach((item, idx) => {
        const headerContent = `
            <h2 class="accordion-header" id="${parentId}-header${idx}">
                <button class="accordion-button collapsed p-2" type="button" 
                    data-bs-toggle="collapse" data-bs-target="#${parentId}-collapse${idx}" 
                    aria-expanded="false" aria-controls="${parentId}-collapse${idx}">
                        <div class="d-flex justify-content-between w-100 padding">
                            <span><strong>${item[titleFields[0]] ?? ''}</strong></span>
                            <span><strong>${item[titleFields[1]] ?? ''}</strong></span>
                        </div>
                </button>
            </h2>
        `;

        let listItems = '';
        columns.forEach(col => {
            const key = col.data;
            if (!hiddenFields.includes(key) && !titleFields.includes(key)) {
                const value = item[key] ?? '';
                listItems += `
                    <li class="d-flex justify-content-between">
                        <strong>${col.title}:</strong> <span class="text-right">${value}</span>
                    </li>
                `;
            }
        });

        const bodyContent = `
            <div id="${parentId}-collapse${idx}" class="accordion-collapse collapse" 
                aria-labelledby="${parentId}-header${idx}" data-bs-parent="#${parentId}">
                    <div class="accordion-body">
                        <ul class="list-unstyled mb-0">
                            ${listItems}
                        </ul>
                    </div>
            </div>
        `;

        htmlContent += `
            <div class="accordion-item">
                ${headerContent}
                ${bodyContent}
            </div>
        `;
    });

    return $(elementId).html(htmlContent);
}

async function renderDataTable({
    selector, 
    data,
    columns,
    hiddenColumns = [],
    rightAlignColumns = [],
    sortable = false,
    searching = false,
    paging = false,
    lengthChange = false,
    info = false,
    autoWidth = true,
    scrollX = false,
    additionalOptions = {}
}) {
    return $(selector).DataTable({
        data,
        columns,
        searching,
        paging,
        lengthChange,
        info,
        autoWidth,
        scrollX,
        destroy: true,
        columnDefs: [
            { targets: '_all', orderable: sortable === true },
            ...hiddenColumns.map(index => ({
                targets: index, visible: false, searchable: false
            })),
            ...rightAlignColumns.map(index => ({
                targets: index, createdCell: (td) => $(td).addClass('text-right')
            }))
        ],
        ...additionalOptions
    });
}

async function renderLineChart({
    chartId,
    chartTitle = '',
    data = {},
    currency = '',
    isLogScale = false,
    showLegend = true,
    showRangeSlider = true
}) {
    let plotData = [];

    const layout = {
        title: chartTitle,
        titlefont: { size: 20, color: '#2C3E50' },
        plot_bgcolor: '#FFFFFF',
        paper_bgcolor: '#F2F6F9',
        font: { family: 'Segoe UI', color: '#333' },
        margin: { l: 40, r: 20, t: 60, b: 80 },
        legend: { visible: showLegend },
        template: 'none',
        hovermode: 'x unified'
    };

    plotData = data.series.map((series, idx) => ({
        x: series.dates,
        y: series.values.map(v => v * (series.fxRate || 1)),
        mode: 'lines',
        name: series.label || `Series ${idx + 1}`,
        line: { color: series.color || undefined, width: 2, dash: series.dash || 'solid' },
        hovertemplate: `Date: %{x}<br>Price: %{y:.2f} ${currency}<extra></extra>`
    }));

    if (data.avgLine && data.avgLine.value > 0) {
        const avgLine = {
            x: data.series[0].dates,
            y: new Array(data.series[0].dates.length).fill(data.avgLine.value),
            mode: 'lines',
            name: `Avg: ${data.avgLine.value}`,
            line: { color: '#95A5A6', width: 2, dash: 'dot' },
            hoverinfo: 'skip'
        };
        plotData.push(avgLine);

        layout.annotations = [{
            x: data.series[0].dates[0],
            y: data.avgLine.value + 0.5,
            xref: 'x',
            yref: 'y',
            text: `Avg: ${data.avgLine.value}`,
            showarrow: false,
            font: { size: 12, color: '#FFFFFF', family: 'Segoe UI' },
            align: 'left',
            bgcolor: '#95A5A6',
            borderpad: 4,
            bordercolor: '#95A5A6',
            borderwidth: 1,
            opacity: 0.8
        }];
    }

    layout.xaxis = {
        title: { text: 'Dates', font: { size: 14, color: '#333' }},
        showgrid: true,
        gridcolor: '#E5E5E5',
        tickfont: { size: 10 },
        type: 'date'
    };

    if (showRangeSlider) {
        let minDate = null, maxDate = null;
        data.series.forEach(s => {
            if (!s.dates || s.dates.length === 0) {
                return;
            }

            const start = new Date(s.dates[0]);
            const end = new Date(s.dates[s.dates.length - 1]);

            if (!minDate || start < minDate) {
                minDate = start;
            }
            if (!maxDate || end > maxDate) {
                maxDate = end;
            }
        });
        const yearRange = (maxDate - minDate) / (1000 * 60 * 60 * 24 * 365.25);
        const rangeButtons = [
            { count: 1, label: '1M', step: 'month', stepmode: 'backward' },
            { count: 3, label: '3M', step: 'month', stepmode: 'backward' },
            { count: 6, label: '6M', step: 'month', stepmode: 'backward' },
            { count: 1, label: '1Y', step: 'year', stepmode: 'backward' },
            { count: 2, label: '2Y', step: 'year', stepmode: 'backward' },
            { count: 5, label: '5Y', step: 'year', stepmode: 'backward' },
            { count: 10, label: '10Y', step: 'year', stepmode: 'backward' },
            { count: 15, label: '15Y', step: 'year', stepmode: 'backward' },
            { count: 20, label: '20Y', step: 'year', stepmode: 'backward' },
            { step: 'all' }
        ].filter(btn => {
            if (btn.step === 'all') return true;
            if (btn.step === 'month') return yearRange * 12 >= btn.count;
            if (btn.step === 'year') return yearRange >= btn.count;
            return false;
        });

        layout.xaxis.rangeselector = { buttons: rangeButtons };
        layout.xaxis.rangeslider = { visible: true };
    } else {
        layout.xaxis.rangeslider = { visible: false };
    }

    layout.yaxis = {
        title: { text: `Price (in ${currency})`, font: { size: 14, color: '#333' }},
        showgrid: true,
        gridcolor: '#E5E5E5',
        type: isLogScale ? 'log' : 'linear',
        tickformat: ',.2r'
    };

    return Plotly.newPlot(chartId, plotData, layout, { responsive: true });
}

async function renderPieChart({
    chartId,
    chartTitle = '',
    data = {},
    showLegend = true,
    legendPosition = 'outside'
}) {
    const layout = {
        title: chartTitle,
        titlefont: { size: 20, color: '#2C3E50' },
        plot_bgcolor: '#FFFFFF',
        paper_bgcolor: '#F2F6F9',
        font: { family: 'Segoe UI', color: '#333' },
        margin: { l: 40, r: 20, t: 60, b: 80 },
        hovermode: 'x unified',
        showlegend: showLegend
    };

    const plotData = [{
        type: 'pie',
        labels: data.labels,
        values: data.values,
        text: data.hoverTexts,
        hoverinfo: 'text',
        hole: 0.5,
        textinfo: 'label+percent',
        textposition: legendPosition,
        marker: { line: { width: 1, color: '#FFFFFF' } }
    }];

    return Plotly.newPlot(chartId, plotData, layout, { responsive: true });
}