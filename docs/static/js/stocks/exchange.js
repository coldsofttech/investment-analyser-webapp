const exchanges = [
    { exchange: 'NYQ', full_name: 'New York Stock Exchange (NYSE)' },
    { exchange: 'NMS', full_name: 'NASDAQ' },
    { exchange: 'PCX', full_name: 'NYSE Arca' },
    { exchange: 'NGM', full_name: 'NASDAQ Global Market (NASDAQ GM)' },
    { exchange: 'BATS', full_name: 'Bats Exchange (BATS)' },
    { exchange: 'TOR', full_name: 'Toronto Stock Exchange (TSX)' },
    { exchange: 'LSE', full_name: 'London Stock Exchange (LSE)' },
    { exchange: 'ASQ', full_name: 'NASDAQ Capital Market (NASDAQ CM)' },
    { exchange: 'PNK', full_name: 'OTC Markets (PNK)' },
    { exchange: 'GER', full_name: 'Börse Frankfurt (FRA)' },
    { exchange: 'MIL', full_name: 'Borsa Italiana (MIL)' },
    { exchange: 'SGO', full_name: 'Santiago Stock Exchange (SGO)' },
    { exchange: 'BUE', full_name: 'Buenos Aires Stock Exchange (BUE)' },
    { exchange: 'HKQ', full_name: 'Hong Kong Stock Exchange (HKEX)' },
    { exchange: 'TWO', full_name: 'Taiwan OTC Exchange (TWO)' },
    { exchange: 'TAI', full_name: 'Taiwan Stock Exchange (TWSE)' }
]

async function getExchanges() {
    return exchanges;
}