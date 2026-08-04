import Dexie, { type Table } from 'dexie'
import type {
  Account,
  AppSetting,
  Asset,
  ExchangeRate,
  Metadata,
  PortfolioSnapshot,
  Position,
  Price
} from '@/types/domain'

export class OpenPortfolioDatabase extends Dexie {
  accounts!: Table<Account, string>
  assets!: Table<Asset, string>
  positions!: Table<Position, string>
  prices!: Table<Price, string>
  exchangeRates!: Table<ExchangeRate, string>
  portfolioSnapshots!: Table<PortfolioSnapshot, string>
  appSettings!: Table<AppSetting, string>
  metadata!: Table<Metadata, string>

  constructor() {
    super('openportfolio')

    this.version(1).stores({
      accounts: 'id, name, type, defaultCurrency, market, isArchived, sortOrder, updatedAt',
      assets: 'id, symbol, name, assetType, market, currency, [market+symbol+currency], isActive, updatedAt',
      positions: 'id, accountId, assetId, [accountId+assetId], isClosed, updatedAt',
      prices: 'id, &assetId, currency, priceType, providerId, priceDate, fetchedAt, status',
      exchangeRates: 'id, &[baseCurrency+quoteCurrency], baseCurrency, quoteCurrency, rateDate, fetchedAt, status',
      portfolioSnapshots: 'id, &snapshotDate, snapshotTime, createdAt',
      appSettings: '&key, updatedAt',
      metadata: '&key, updatedAt'
    })
  }
}

export const db = new OpenPortfolioDatabase()
