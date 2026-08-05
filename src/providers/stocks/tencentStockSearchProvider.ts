import type { AssetCandidate } from '@/providers/manualAssetCatalog'

type TencentMarket = 'sh' | 'sz' | 'hk' | 'us'
type TencentSuggestRow = string[]

export async function searchTencentStocks(query: string): Promise<AssetCandidate[]> {
  const keyword = query.trim()
  if (keyword.length < 2) return []
  const rows = await fetchTencentSuggestRows(keyword)
  return rows.map(mapTencentRow).filter((candidate): candidate is AssetCandidate => Boolean(candidate))
}

async function fetchTencentSuggestRows(query: string): Promise<TencentSuggestRow[]> {
  const url = `https://smartbox.gtimg.cn/s3/?v=2&t=all&c=1&q=${encodeURIComponent(query)}`
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Tencent stock search failed')
    return parseTencentSuggestText(await response.text())
  } catch {
    return loadTencentSuggestViaScript(url)
  }
}

function loadTencentSuggestViaScript(url: string): Promise<TencentSuggestRow[]> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const host = globalThis as typeof globalThis & { v_hint?: string }
    const previousHint = host.v_hint
    const cleanup = () => {
      if (previousHint !== undefined) {
        host.v_hint = previousHint
      } else {
        delete host.v_hint
      }
      script.remove()
    }

    script.src = url
    script.async = true
    script.onload = () => {
      const hint = host.v_hint
      cleanup()
      resolve(parseTencentHint(hint ?? ''))
    }
    script.onerror = () => {
      cleanup()
      reject(new Error('Tencent stock search script failed'))
    }
    document.head.appendChild(script)
  })
}

function parseTencentSuggestText(text: string): TencentSuggestRow[] {
  const match = text.match(/v_hint="([^"]*)"/)
  return parseTencentHint(match?.[1] ?? '')
}

function parseTencentHint(hint: string): TencentSuggestRow[] {
  if (!hint || hint.startsWith('N')) return []
  return hint
    .split('^')
    .map((item) => item.split('~'))
    .filter((row) => row.length >= 3)
}

function mapTencentRow(row: TencentSuggestRow): AssetCandidate | undefined {
  const market = row[0]?.toLowerCase() as TencentMarket | undefined
  const symbol = row[1]
  const name = row[2]
  if (!market || !symbol || !name) return undefined

  if (market === 'sh' || market === 'sz') {
    return {
      symbol,
      name,
      assetType: inferCnAssetType(symbol, name),
      market: 'CN',
      currency: 'CNY',
      source: 'online'
    }
  }

  if (market === 'hk') {
    return {
      symbol,
      name,
      assetType: inferHkAssetType(name),
      market: 'HK',
      currency: 'HKD',
      source: 'online'
    }
  }

  if (market === 'us') {
    return {
      symbol: normalizeTencentUsSymbol(symbol),
      name,
      assetType: inferUsAssetType(name),
      market: 'US',
      currency: 'USD',
      source: 'online'
    }
  }

  return undefined
}

function inferCnAssetType(symbol: string, name: string): AssetCandidate['assetType'] {
  const upperName = name.toUpperCase()
  if (upperName.includes('ETF') || symbol.startsWith('15') || symbol.startsWith('16') || symbol.startsWith('5')) {
    return 'etf'
  }
  return 'stock'
}

function inferHkAssetType(name: string): AssetCandidate['assetType'] {
  return name.toUpperCase().includes('ETF') ? 'etf' : 'stock'
}

function inferUsAssetType(name: string): AssetCandidate['assetType'] {
  return name.toUpperCase().includes('ETF') ? 'etf' : 'stock'
}

export function normalizeTencentUsSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/\.(OQ|N|AM)$/i, '')
}
