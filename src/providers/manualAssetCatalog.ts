import type { AssetType, CurrencyCode, MarketCode } from '@/types/domain'

export interface AssetCandidate {
  symbol: string
  name: string
  assetType: AssetType
  market: MarketCode
  currency: CurrencyCode
  source: 'local' | 'built_in' | 'online'
}

export const builtInAssetCatalog: AssetCandidate[] = [
  {
    symbol: '600519',
    name: '贵州茅台',
    assetType: 'stock',
    market: 'CN',
    currency: 'CNY',
    source: 'built_in'
  },
  {
    symbol: '000001',
    name: '平安银行',
    assetType: 'stock',
    market: 'CN',
    currency: 'CNY',
    source: 'built_in'
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    assetType: 'etf',
    market: 'US',
    currency: 'USD',
    source: 'built_in'
  },
  {
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    assetType: 'etf',
    market: 'US',
    currency: 'USD',
    source: 'built_in'
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'stock',
    market: 'US',
    currency: 'USD',
    source: 'built_in'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetType: 'stock',
    market: 'US',
    currency: 'USD',
    source: 'built_in'
  },
  {
    symbol: 'CASH_CNY',
    name: '人民币现金',
    assetType: 'cash',
    market: 'CASH',
    currency: 'CNY',
    source: 'built_in'
  },
  {
    symbol: 'CASH_USD',
    name: '美元现金',
    assetType: 'cash',
    market: 'CASH',
    currency: 'USD',
    source: 'built_in'
  }
]
