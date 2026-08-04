import type {
  Account,
  Asset,
  CurrencyCode,
  ExchangeRate,
  PortfolioSummary,
  Position,
  PositionValuation,
  Price,
  SummaryItem
} from '@/types/domain'

export function calculateTotalCost(quantity: number, averageCost: number): number {
  return quantity * averageCost
}

export function calculateMarketValue(quantity: number, price: number): number {
  return quantity * price
}

export function calculateProfitLoss(marketValue: number, totalCost: number): number {
  return marketValue - totalCost
}

export function calculateProfitRate(profitLoss: number, totalCost: number): number | undefined {
  if (totalCost === 0) return undefined
  return profitLoss / totalCost
}

export function convertCurrency(amount: number, from: CurrencyCode, to: CurrencyCode, usdToCny?: number): number | undefined {
  if (from === to) return amount
  if (!usdToCny || usdToCny <= 0) return undefined
  if (from === 'USD' && to === 'CNY') return amount * usdToCny
  if (from === 'CNY' && to === 'USD') return amount / usdToCny
  return undefined
}

export function convertCurrencyWithRates(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRate[]
): number | undefined {
  if (from === to) return amount
  const valueCNY = toCny(amount, from, rates)
  if (valueCNY === undefined) return undefined
  if (to === 'CNY') return valueCNY
  return fromCny(valueCNY, to, rates)
}

export function getUsdToCnyRate(rates: ExchangeRate[]): number | undefined {
  const direct = rates.find((rate) => rate.baseCurrency === 'USD' && rate.quoteCurrency === 'CNY' && rate.status === 'valid')
  if (direct) return direct.rate
  const inverse = rates.find((rate) => rate.baseCurrency === 'CNY' && rate.quoteCurrency === 'USD' && rate.status === 'valid')
  return inverse ? 1 / inverse.rate : undefined
}

export function calculatePortfolioSummary(input: {
  accounts: Account[]
  assets: Asset[]
  positions: Position[]
  prices: Price[]
  rates: ExchangeRate[]
  calculatedAt?: string
}): PortfolioSummary {
  const usdToCny = getUsdToCnyRate(input.rates)
  const assetsById = new Map(input.assets.map((asset) => [asset.id, asset]))
  const pricesByAssetId = new Map(input.prices.map((price) => [price.assetId, price]))
  const openPositions = input.positions.filter((position) => !position.isClosed)
  const valuations: PositionValuation[] = openPositions.map((position) => {
    const asset = assetsById.get(position.assetId)
    if (!asset) {
      return missingValuation(position, '未知资产')
    }

    const totalCost = calculateTotalCost(position.quantity, position.averageCost)
    const hasCostBasis = position.averageCost > 0
    const cachedPrice = pricesByAssetId.get(asset.id)
    const effectivePrice = asset.assetType === 'cash' ? 1 : position.priceMode === 'manual' ? position.manualPrice : cachedPrice?.price
    if (effectivePrice === undefined || Number.isNaN(effectivePrice)) {
      return {
        ...baseValuation(position, asset.name, asset.symbol, asset.assetType, asset.currency),
        totalCost,
        priceStatus: 'missing'
      }
    }

    const marketValue = asset.assetType === 'cash' ? position.quantity : calculateMarketValue(position.quantity, effectivePrice)
    const profitLoss = hasCostBasis ? calculateProfitLoss(marketValue, totalCost) : undefined
    const valueCNY = convertCurrencyWithRates(marketValue, asset.currency, 'CNY', input.rates)
    const valueUSD = convertCurrencyWithRates(marketValue, asset.currency, 'USD', input.rates)
    const costCNY = hasCostBasis ? convertCurrencyWithRates(totalCost, position.costCurrency, 'CNY', input.rates) : undefined
    const costUSD = hasCostBasis ? convertCurrencyWithRates(totalCost, position.costCurrency, 'USD', input.rates) : undefined
    const profitCNY =
      profitLoss === undefined ? undefined : convertCurrencyWithRates(profitLoss, asset.currency, 'CNY', input.rates)
    const profitUSD =
      profitLoss === undefined ? undefined : convertCurrencyWithRates(profitLoss, asset.currency, 'USD', input.rates)

    return {
      ...baseValuation(position, asset.name, asset.symbol, asset.assetType, asset.currency),
      currentPrice: effectivePrice,
      priceDate: position.priceMode === 'manual' ? position.manualPriceDate : cachedPrice?.priceDate,
      totalCost,
      marketValue,
      profitLoss,
      profitRate: profitLoss === undefined ? undefined : calculateProfitRate(profitLoss, totalCost),
      valueCNY,
      valueUSD,
      priceStatus: cachedPrice?.status === 'stale' ? 'stale' : 'valid',
      totalCostCNY: costCNY,
      totalCostUSD: costUSD,
      profitCNY,
      profitUSD
    } as PositionValuation & { totalCostCNY?: number; totalCostUSD?: number; profitCNY?: number; profitUSD?: number }
  })

  const totalValueCNY = sumDefined(valuations.map((item) => item.valueCNY))
  const totalValueUSD = sumDefined(valuations.map((item) => item.valueUSD))
  const costCNY = sumDefined(valuations.map((item) => (item as PositionValuation & { totalCostCNY?: number }).totalCostCNY))
  const costUSD = sumDefined(valuations.map((item) => (item as PositionValuation & { totalCostUSD?: number }).totalCostUSD))
  const totalProfitCNY = sumDefined(valuations.map((item) => (item as PositionValuation & { profitCNY?: number }).profitCNY))
  const totalProfitUSD = sumDefined(valuations.map((item) => (item as PositionValuation & { profitUSD?: number }).profitUSD))

  return {
    totalValueCNY,
    totalValueUSD,
    totalCostCNY: costCNY,
    totalCostUSD: costUSD,
    totalProfitCNY,
    totalProfitUSD,
    positions: valuations,
    accountBreakdown: breakdownBy(valuations, input.accounts, 'account'),
    currencyBreakdown: breakdownBy(valuations, input.accounts, 'currency'),
    assetTypeBreakdown: breakdownBy(valuations, input.accounts, 'assetType'),
    missingPriceCount: valuations.filter((item) => item.priceStatus === 'missing').length,
    stalePriceCount: valuations.filter((item) => item.priceStatus === 'stale').length,
    calculatedAt: input.calculatedAt ?? new Date().toISOString()
  }
}

function toCny(amount: number, from: CurrencyCode, rates: ExchangeRate[]): number | undefined {
  if (from === 'CNY') return amount
  const rate = findRate(from, 'CNY', rates)
  return rate === undefined ? undefined : amount * rate
}

function fromCny(amount: number, to: CurrencyCode, rates: ExchangeRate[]): number | undefined {
  if (to === 'CNY') return amount
  const rate = findRate(to, 'CNY', rates)
  return rate === undefined ? undefined : amount / rate
}

function findRate(baseCurrency: CurrencyCode, quoteCurrency: CurrencyCode, rates: ExchangeRate[]): number | undefined {
  const direct = rates.find(
    (rate) => rate.baseCurrency === baseCurrency && rate.quoteCurrency === quoteCurrency && rate.status === 'valid'
  )
  if (direct) return direct.rate
  const inverse = rates.find(
    (rate) => rate.baseCurrency === quoteCurrency && rate.quoteCurrency === baseCurrency && rate.status === 'valid'
  )
  return inverse ? 1 / inverse.rate : undefined
}

function baseValuation(
  position: Position,
  assetName: string,
  assetSymbol: string,
  assetType: PositionValuation['assetType'],
  currency: CurrencyCode
): PositionValuation {
  return {
    positionId: position.id,
    accountId: position.accountId,
    assetId: position.assetId,
    assetName,
    assetSymbol,
    assetType,
    quantity: position.quantity,
    averageCost: position.averageCost,
    totalCost: 0,
    nativeCurrency: currency,
    priceStatus: 'missing'
  }
}

function missingValuation(position: Position, assetName: string): PositionValuation {
  return {
    ...baseValuation(position, assetName, 'UNKNOWN', 'other', position.costCurrency),
    totalCost: calculateTotalCost(position.quantity, position.averageCost)
  }
}

function sumDefined(values: Array<number | undefined>): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
}

function breakdownBy(
  valuations: PositionValuation[],
  accounts: Account[],
  mode: 'account' | 'currency' | 'assetType'
): SummaryItem[] {
  const names = new Map(accounts.map((account) => [account.id, account.name]))
  const grouped = new Map<string, SummaryItem>()
  for (const valuation of valuations) {
    if (valuation.valueCNY === undefined || valuation.valueUSD === undefined) continue
    const key =
      mode === 'account' ? valuation.accountId : mode === 'currency' ? valuation.nativeCurrency : valuation.assetType
    const name = mode === 'account' ? names.get(key) ?? key : key
    const current = grouped.get(key) ?? { key, name, valueCNY: 0, valueUSD: 0, percentage: 0 }
    current.valueCNY += valuation.valueCNY
    current.valueUSD += valuation.valueUSD
    grouped.set(key, current)
  }
  const total = sumDefined(Array.from(grouped.values()).map((item) => item.valueCNY))
  return Array.from(grouped.values()).map((item) => ({
    ...item,
    percentage: total === 0 ? 0 : item.valueCNY / total
  }))
}
