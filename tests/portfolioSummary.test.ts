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
      },
      {
        id: 'fx_hkd_cny',
        baseCurrency: 'HKD',
        quoteCurrency: 'CNY',
        rate: 0.92,
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
    expect(summary.totalValueHKD).toBeCloseTo(7826.0869)
    expect(summary.totalProfitUSD).toBe(200)
    expect(summary.totalProfitCNY).toBe(1440)
    expect(summary.totalProfitHKD).toBeCloseTo(1565.2173)
    expect(summary.rawCurrencyBreakdown).toEqual([{ currency: 'USD', value: 1000, profitLoss: 200, percentage: 1 }])
    expect(summary.assetTypeBreakdown).toHaveLength(1)
    expect(summary.assetTypeBreakdown[0].key).toBe('stock')
    expect(summary.missingPriceCount).toBe(1)
  })

  it('uses manually entered fund profit to calculate fund profit rate', () => {
    const accounts: Account[] = [
      {
        id: 'acc_fund',
        name: '天天基金',
        type: 'cny_fund',
        defaultCurrency: 'CNY',
        isArchived: false,
        sortOrder: 1,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const assets: Asset[] = [
      {
        id: 'asset_fund',
        symbol: '000001',
        name: '示例基金',
        assetType: 'fund',
        market: 'FUND_CN',
        currency: 'CNY',
        isActive: true,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const positions: Position[] = [
      {
        id: 'pos_fund',
        accountId: 'acc_fund',
        assetId: 'asset_fund',
        quantity: 1000,
        averageCost: 0,
        holdingProfit: 200,
        costCurrency: 'CNY',
        priceMode: 'auto',
        isClosed: false,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const prices: Price[] = [
      {
        id: 'price_fund',
        assetId: 'asset_fund',
        price: 1.2,
        currency: 'CNY',
        priceType: 'nav',
        providerId: 'manual',
        priceDate: '2026-08-04',
        fetchedAt: '2026-08-04T00:00:00.000Z',
        delayed: false,
        status: 'valid',
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]

    const summary = calculatePortfolioSummary({ accounts, assets, positions, prices, rates: [] })
    const fund = summary.positions[0]

    expect(fund.marketValue).toBe(1200)
    expect(fund.totalCost).toBe(1000)
    expect(fund.profitLoss).toBe(200)
    expect(fund.profitRate).toBe(0.2)
  })

  it('does not calculate a fund profit rate from negative inferred cost', () => {
    const accounts: Account[] = []
    const assets: Asset[] = [
      {
        id: 'asset_fund',
        symbol: '000001',
        name: '示例基金',
        assetType: 'fund',
        market: 'FUND_CN',
        currency: 'CNY',
        isActive: true,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const positions: Position[] = [
      {
        id: 'pos_fund',
        accountId: 'acc_fund',
        assetId: 'asset_fund',
        quantity: 100,
        averageCost: 0,
        holdingProfit: 400,
        costCurrency: 'CNY',
        priceMode: 'auto',
        isClosed: false,
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]
    const prices: Price[] = [
      {
        id: 'price_fund',
        assetId: 'asset_fund',
        price: 1.1877,
        currency: 'CNY',
        priceType: 'nav',
        providerId: 'manual',
        priceDate: '2026-08-04',
        fetchedAt: '2026-08-04T00:00:00.000Z',
        delayed: false,
        status: 'valid',
        createdAt: '2026-08-04T00:00:00.000Z',
        updatedAt: '2026-08-04T00:00:00.000Z'
      }
    ]

    const summary = calculatePortfolioSummary({ accounts, assets, positions, prices, rates: [] })
    const fund = summary.positions[0]

    expect(fund.marketValue).toBe(118.77)
    expect(fund.profitLoss).toBe(400)
    expect(fund.profitRate).toBeUndefined()
  })
})
