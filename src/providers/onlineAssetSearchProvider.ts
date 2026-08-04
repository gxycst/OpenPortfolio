import type { AssetCandidate } from '@/providers/manualAssetCatalog'

interface YahooFinanceSearchResponse {
  quotes?: Array<{
    symbol?: string
    shortname?: string
    longname?: string
    quoteType?: string
    exchange?: string
  }>
}

type EastmoneyFundRow = [string, string, string, string, string]

let cachedFunds: AssetCandidate[] | undefined

export async function searchOnlineAssets(query: string): Promise<AssetCandidate[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const [stocks, funds] = await Promise.allSettled([
    searchYahooFinance(normalizedQuery),
    searchEastmoneyFunds(normalizedQuery)
  ])

  return [
    ...(stocks.status === 'fulfilled' ? stocks.value : []),
    ...(funds.status === 'fulfilled' ? funds.value : [])
  ]
}

async function searchYahooFinance(query: string): Promise<AssetCandidate[]> {
  const url = new URL('https://query1.finance.yahoo.com/v1/finance/search')
  url.searchParams.set('q', query)
  url.searchParams.set('quotesCount', '8')
  url.searchParams.set('newsCount', '0')
  url.searchParams.set('listsCount', '0')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Yahoo Finance search failed')
  const data = (await response.json()) as YahooFinanceSearchResponse

  return (data.quotes ?? [])
    .filter((quote) => quote.symbol && quote.quoteType)
    .map((quote) => ({
      symbol: quote.symbol ?? '',
      name: quote.longname || quote.shortname || quote.symbol || '',
      assetType: quote.quoteType === 'ETF' ? 'etf' : quote.quoteType === 'MUTUALFUND' ? 'fund' : 'stock',
      market: inferMarket(quote.symbol ?? '', quote.exchange),
      currency: inferCurrency(quote.symbol ?? '', quote.exchange),
      source: 'online' as const
    }))
}

async function searchEastmoneyFunds(query: string): Promise<AssetCandidate[]> {
  const funds = cachedFunds ?? (await fetchEastmoneyFundCatalog())
  cachedFunds = funds
  const normalizedQuery = query.toUpperCase()
  return funds
    .filter(
      (fund) =>
        fund.symbol.toUpperCase().includes(normalizedQuery) ||
        fund.name.toUpperCase().includes(normalizedQuery)
    )
    .slice(0, 8)
}

async function fetchEastmoneyFundCatalog(): Promise<AssetCandidate[]> {
  let text = ''
  try {
    const response = await fetch('https://fund.eastmoney.com/js/fundcode_search.js')
    if (!response.ok) throw new Error('Eastmoney fund catalog failed')
    text = await response.text()
  } catch {
    return loadEastmoneyFundCatalogViaScript()
  }
  const match = text.match(/var\s+r\s*=\s*(\[.*\]);?/)
  if (!match) throw new Error('Unexpected Eastmoney fund catalog response')
  const rows = JSON.parse(match[1]) as EastmoneyFundRow[]
  return mapEastmoneyRows(rows)
}

function loadEastmoneyFundCatalogViaScript(): Promise<AssetCandidate[]> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://fund.eastmoney.com/js/fundcode_search.js'
    script.async = true
    script.onload = () => {
      const rows = (globalThis as typeof globalThis & { r?: EastmoneyFundRow[] }).r
      script.remove()
      if (!rows) {
        reject(new Error('Eastmoney fund script did not expose catalog'))
        return
      }
      resolve(mapEastmoneyRows(rows))
    }
    script.onerror = () => {
      script.remove()
      reject(new Error('Eastmoney fund script failed'))
    }
    document.head.appendChild(script)
  })
}

function mapEastmoneyRows(rows: EastmoneyFundRow[]): AssetCandidate[] {
  return rows.map((row) => ({
    symbol: row[0],
    name: row[2],
    assetType: 'fund',
    market: 'FUND_CN',
    currency: 'CNY',
    source: 'online' as const
  }))
}

function inferMarket(symbol: string, exchange?: string): AssetCandidate['market'] {
  if (symbol.endsWith('.SS') || symbol.endsWith('.SZ') || exchange === 'SHH' || exchange === 'SHZ') return 'CN'
  if (exchange === 'PNK') return 'OTHER'
  return 'US'
}

function inferCurrency(symbol: string, exchange?: string): AssetCandidate['currency'] {
  if (symbol.endsWith('.SS') || symbol.endsWith('.SZ') || exchange === 'SHH' || exchange === 'SHZ') return 'CNY'
  return 'USD'
}
