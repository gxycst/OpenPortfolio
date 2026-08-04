import { describe, expect, it } from 'vitest'
import { calculatePortfolioSummary, convertCurrency } from '@/calculations/portfolioSummary'
import type { Account, Asset, ExchangeRate, Position, Price } from '@/types/domain'

describe('portfolio calculations', () => {
  it('converts CNY and USD both ways', () => {
    expect(convertCurrency(10, 'USD', 'CNY', 7.2)).toBe(72)
    expect(convertCurrency(72, 'CNY', 'USD', 7.2)).toBe(10)
  })

  it('calculates totals without using cost as a fallback price', () => {
    const accounts: Account[] = [
      {
        id: 'acc',
        name: '嘉信',
        type: 'us_broker',
        defaultCurrency: 'USD',
        isArchived: false,
        sortOrder: 1,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const assets: Asset[] = [
      {
        id: 'asset_qqq',
        symbol: 'QQQ',
        name: 'QQQ',
        assetType: 'etf',
        market: 'US',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      },
      {
        id: 'asset_missing',
        symbol: 'MISSING',
        name: 'Missing',
        assetType: 'stock',
        market: 'US',
        currency: 'USD',
        isActive: true,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const positions: Position[] = [
      {
        id: 'pos_qqq',
        accountId: 'acc',
        assetId: 'asset_qqq',
        quantity: 2,
        averageCost: 400,
        costCurrency: 'USD',
        priceMode: 'auto',
        isClosed: false,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      },
      {
        id: 'pos_missing',
        accountId: 'acc',
        assetId: 'asset_missing',
        quantity: 1,
        averageCost: 100,
        costCurrency: 'USD',
        priceMode: 'auto',
        isClosed: false,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const prices: Price[] = [
      {
        id: 'price_qqq',
        assetId: 'asset_qqq',
        price: 500,
        currency: 'USD',
        priceType: 'market',
        providerId: 'manual',
        priceDate: '2026-08-04',
        fetchedAt: '2026-08-04T00:00:00.000Z',
        delayed: false,
        status: 'valid',
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const rates: ExchangeRate[] = [
      {
        id: 'fx_usd_cny',
        baseCurrency: 'USD',
        quoteCurrency: 'CNY',
        rate: 7.2,
        providerId: 'manual',
        rateDate: '2026-08-04',
        fetchedAt: '2026-08-04T00:00:00.000Z',
        status: 'valid',
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]

    const summary = calculatePortfolioSummary({ accounts, assets, positions, prices, rates })

    expect(summary.totalValueUSD).toBe(1000)
    expect(summary.totalValueCNY).toBe(7200)
    expect(summary.missingPriceCount).toBe(1)
  })
})
