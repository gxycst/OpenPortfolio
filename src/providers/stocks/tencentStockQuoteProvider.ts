import type { CurrencyCode, MarketCode } from '@/types/domain'
import { normalizeTencentUsSymbol } from '@/providers/stocks/tencentStockSearchProvider'

export interface StockQuote {
  symbol: string
  name: string
  market: MarketCode
  currency: CurrencyCode
  price: number
  priceDate: string
  priceTime?: string
  providerId: 'tencent_quote'
  fetchedAt: string
  delayed: boolean
}

export async function fetchTencentStockQuote(symbol: string, market: MarketCode): Promise<StockQuote> {
  const apiCode = toTencentCode(symbol, market)
  const text = await fetchTencentQuoteText(apiCode)
  const quote = parseTencentQuoteText(text, apiCode, market)
  if (!quote) throw new Error('暂时没有获取到最新价格，请稍后重试')
  return quote
}

async function fetchTencentQuoteText(apiCode: string): Promise<string> {
  const url = `https://qt.gtimg.cn/q=${encodeURIComponent(apiCode)}`
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Tencent quote failed')
    return response.text()
  } catch {
    return loadTencentQuoteViaScript(url, apiCode)
  }
}

function loadTencentQuoteViaScript(url: string, apiCode: string): Promise<string> {
  if (typeof document === 'undefined') return Promise.reject(new Error('Tencent quote script unavailable'))

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const key = `v_${apiCode}`
    const host = globalThis as typeof globalThis & Record<string, string | undefined>
    const previousValue = host[key]
    const cleanup = () => {
      if (previousValue !== undefined) {
        host[key] = previousValue
      } else {
        delete host[key]
      }
      script.remove()
    }

    script.src = url
    script.async = true
    script.onload = () => {
      const value = host[key]
      cleanup()
      resolve(`v_${apiCode}="${value ?? ''}";`)
    }
    script.onerror = () => {
      cleanup()
      reject(new Error('Tencent quote script failed'))
    }
    document.head.appendChild(script)
  })
}

function parseTencentQuoteText(text: string, apiCode: string, market: MarketCode): StockQuote | undefined {
  const escapedCode = apiCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`v_${escapedCode}="([^"]*)"`))
  const payload = match?.[1] ?? ''
  if (!payload || payload.startsWith('N')) return undefined

  const fields = payload.split('~')
  const price = Number(fields[3])
  if (!Number.isFinite(price) || price <= 0) return undefined

  const quoteTime = fields.find((field) => /^\d{14}$/.test(field))
  const priceTime = quoteTime ? formatTencentTime(quoteTime) : undefined
  return {
    symbol: fields[2] || stripTencentPrefix(apiCode),
    name: fields[1] || stripTencentPrefix(apiCode),
    market,
    currency: currencyForMarket(market),
    price,
    priceDate: priceTime?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    priceTime,
    providerId: 'tencent_quote',
    fetchedAt: new Date().toISOString(),
    delayed: true
  }
}

function toTencentCode(symbol: string, market: MarketCode): string {
  const normalized = symbol.trim().toUpperCase()
  if (!normalized) throw new Error('资产代码不能为空')

  if (market === 'CN') {
    const cnSymbol = normalized.replace(/\.(SH|SZ)$/i, '')
    return `${inferCnExchangePrefix(cnSymbol)}${cnSymbol}`
  }

  if (market === 'HK') return `hk${normalized.replace(/^HK/i, '').padStart(5, '0')}`
  if (market === 'US') return `us${normalizeTencentUsSymbol(normalized.replace(/^US/i, ''))}`

  throw new Error('当前账户类型暂不支持自动获取股票价格')
}

function inferCnExchangePrefix(symbol: string): 'sh' | 'sz' {
  return symbol.startsWith('5') || symbol.startsWith('6') || symbol.startsWith('9') ? 'sh' : 'sz'
}

function stripTencentPrefix(apiCode: string): string {
  return apiCode.replace(/^(sh|sz|hk|us)/i, '')
}

function formatTencentTime(value: string): string {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)} ${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}`
}

function currencyForMarket(market: MarketCode): CurrencyCode {
  if (market === 'US') return 'USD'
  if (market === 'HK') return 'HKD'
  return 'CNY'
}
