import { fetchLatestFundNav } from '@/providers/funds/eastmoneyFundNavProvider'
import { fetchTencentStockQuote } from '@/providers/stocks/tencentStockQuoteProvider'
import { assetRepository } from '@/repositories/assetRepository'
import { priceRepository } from '@/repositories/priceRepository'
import type { Asset, MarketCode, Price } from '@/types/domain'

const FUND_NAV_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000
const STOCK_QUOTE_REFRESH_INTERVAL_MS = 30 * 60 * 1000

export const priceService = {
  refreshStaleFundPrices: async () => {
    const assets = await assetRepository.list()
    const funds = assets.filter((asset) => asset.assetType === 'fund')
    await Promise.allSettled(funds.map((asset) => refreshFundPriceIfStale(asset)))
  },
  refreshStaleStockPrices: async () => {
    const assets = await assetRepository.list()
    const stocks = assets.filter((asset) => asset.assetType === 'stock' || asset.assetType === 'etf')
    await Promise.allSettled(stocks.map((asset) => refreshStockPriceIfStale(asset)))
  },
  refreshAllFundPrices: async () => {
    const assets = await assetRepository.list()
    const funds = assets.filter((asset) => asset.assetType === 'fund')
    await Promise.allSettled(funds.map((asset) => priceService.refreshFundPrice(asset)))
  },
  fetchStockQuoteForInput: (symbol: string, market: MarketCode) => fetchTencentStockQuote(symbol, market),
  refreshStockPrice: async (asset: Asset) => {
    const quote = await fetchTencentStockQuote(asset.symbol, asset.market)
    const current = await priceRepository.getByAsset(asset.id)
    const now = new Date().toISOString()
    const price: Price = {
      id: current?.id ?? `price_${asset.id}`,
      assetId: asset.id,
      price: quote.price,
      currency: asset.currency,
      priceType: 'market',
      providerId: quote.providerId,
      priceDate: quote.priceDate,
      fetchedAt: quote.fetchedAt,
      delayed: quote.delayed,
      status: 'valid',
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    }
    await priceRepository.put(price)
    return price
  },
  refreshFundPrice: async (asset: Asset) => {
    const quote = await fetchLatestFundNav(asset.symbol)
    const current = await priceRepository.getByAsset(asset.id)
    const now = new Date().toISOString()
    const price: Price = {
      id: current?.id ?? `price_${asset.id}`,
      assetId: asset.id,
      price: quote.nav,
      currency: asset.currency,
      priceType: 'nav',
      providerId: quote.providerId,
      priceDate: quote.navDate,
      fetchedAt: quote.fetchedAt,
      delayed: false,
      status: 'valid',
      createdAt: current?.createdAt ?? now,
      updatedAt: now
    }
    await priceRepository.put(price)
    return price
  }
}

async function refreshFundPriceIfStale(asset: Asset): Promise<void> {
  const current = await priceRepository.getByAsset(asset.id)
  if (current && Date.now() - new Date(current.fetchedAt).getTime() < FUND_NAV_REFRESH_INTERVAL_MS) return
  await priceService.refreshFundPrice(asset)
}

async function refreshStockPriceIfStale(asset: Asset): Promise<void> {
  const current = await priceRepository.getByAsset(asset.id)
  if (current && Date.now() - new Date(current.fetchedAt).getTime() < STOCK_QUOTE_REFRESH_INTERVAL_MS) return
  await priceService.refreshStockPrice(asset)
}
