export type CurrencyCode = 'CNY' | 'USD' | 'HKD' | 'JPY' | 'EUR' | 'GBP' | 'OTHER'
export type MarketCode = 'CN' | 'US' | 'HK' | 'JP' | 'EU' | 'FUND_CN' | 'CASH' | 'OTHER'

export type AccountType =
  | 'cn_stock'
  | 'us_stock'
  | 'hk_stock'
  | 'usd_fund'
  | 'hkd_fund'
  | 'cny_fund'
  | 'usd_cash'
  | 'hkd_cash'
  | 'cny_cash'
  | 'china_broker'
  | 'us_broker'
  | 'fund_platform'
  | 'bank'
  | 'cash'
  | 'other'

export interface Account {
  id: string
  name: string
  type: AccountType
  institution?: string
  defaultCurrency: CurrencyCode
  market?: MarketCode
  note?: string
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type AssetType = 'stock' | 'etf' | 'fund' | 'cash' | 'bond' | 'commodity' | 'crypto' | 'other'

export interface Asset {
  id: string
  symbol: string
  name: string
  assetType: AssetType
  market: MarketCode
  currency: CurrencyCode
  exchange?: string
  fundShareClass?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type PriceMode = 'auto' | 'manual'

export interface Position {
  id: string
  accountId: string
  assetId: string
  quantity: number
  averageCost: number
  costCurrency: CurrencyCode
  priceMode: PriceMode
  manualPrice?: number
  manualPriceDate?: string
  openedAt?: string
  note?: string
  isClosed: boolean
  createdAt: string
  updatedAt: string
}

export type PriceType = 'market' | 'nav' | 'manual' | 'fixed'
export type PriceStatus = 'valid' | 'stale' | 'error'

export interface Price {
  id: string
  assetId: string
  price: number
  currency: CurrencyCode
  priceType: PriceType
  providerId: string
  priceDate: string
  fetchedAt: string
  delayed: boolean
  status: PriceStatus
  errorCode?: string
  createdAt: string
  updatedAt: string
}

export type ExchangeRateStatus = 'valid' | 'stale' | 'error'

export interface ExchangeRate {
  id: string
  baseCurrency: CurrencyCode
  quoteCurrency: CurrencyCode
  rate: number
  providerId: string
  rateDate: string
  fetchedAt: string
  status: ExchangeRateStatus
  errorCode?: string
  createdAt: string
  updatedAt: string
}

export interface PortfolioSnapshot {
  id: string
  snapshotDate: string
  snapshotTime: string
  baseCurrency: CurrencyCode
  totalValueCNY: number
  totalValueUSD: number
  totalCostCNY: number
  totalCostUSD: number
  totalProfitCNY: number
  totalProfitUSD: number
  exchangeRateUSDToCNY: number
  accountBreakdown: SummaryItem[]
  currencyBreakdown: SummaryItem[]
  assetTypeBreakdown: SummaryItem[]
  positionCount: number
  createdAt: string
}

export interface AppSetting {
  key: string
  value: unknown
  updatedAt: string
}

export interface Metadata {
  key: string
  value: unknown
  updatedAt: string
}

export interface PositionValuation {
  positionId: string
  accountId: string
  assetId: string
  assetName: string
  assetSymbol: string
  assetType: AssetType
  quantity: number
  averageCost: number
  currentPrice?: number
  priceDate?: string
  totalCost: number
  marketValue?: number
  profitLoss?: number
  profitRate?: number
  nativeCurrency: CurrencyCode
  valueCNY?: number
  valueUSD?: number
  priceStatus: 'valid' | 'stale' | 'missing'
}

export interface SummaryItem {
  key: string
  name: string
  valueCNY: number
  valueUSD: number
  percentage: number
}

export interface PortfolioSummary {
  totalValueCNY: number
  totalValueUSD: number
  totalCostCNY: number
  totalCostUSD: number
  totalProfitCNY: number
  totalProfitUSD: number
  positions: PositionValuation[]
  accountBreakdown: SummaryItem[]
  currencyBreakdown: SummaryItem[]
  assetTypeBreakdown: SummaryItem[]
  missingPriceCount: number
  stalePriceCount: number
  calculatedAt: string
}
