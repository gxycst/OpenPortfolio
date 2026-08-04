import { db } from '@/database/database'
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

export interface BackupData {
  accounts: Account[]
  assets: Asset[]
  positions: Position[]
  prices: Price[]
  exchangeRates: ExchangeRate[]
  portfolioSnapshots: PortfolioSnapshot[]
  appSettings: AppSetting[]
  metadata: Metadata[]
}

export const backupRepository = {
  exportAll: async (): Promise<BackupData> => ({
    accounts: await db.accounts.toArray(),
    assets: await db.assets.toArray(),
    positions: await db.positions.toArray(),
    prices: await db.prices.toArray(),
    exchangeRates: await db.exchangeRates.toArray(),
    portfolioSnapshots: await db.portfolioSnapshots.toArray(),
    appSettings: await db.appSettings.toArray(),
    metadata: await db.metadata.toArray()
  }),
  replaceAll: async (data: BackupData) =>
    db.transaction(
      'rw',
      [
        db.accounts,
        db.assets,
        db.positions,
        db.prices,
        db.exchangeRates,
        db.portfolioSnapshots,
        db.appSettings,
        db.metadata
      ],
      async () => {
        await db.accounts.clear()
        await db.assets.clear()
        await db.positions.clear()
        await db.prices.clear()
        await db.exchangeRates.clear()
        await db.portfolioSnapshots.clear()
        await db.appSettings.clear()
        await db.metadata.clear()
        await db.accounts.bulkPut(data.accounts)
        await db.assets.bulkPut(data.assets)
        await db.positions.bulkPut(data.positions)
        await db.prices.bulkPut(data.prices)
        await db.exchangeRates.bulkPut(data.exchangeRates)
        await db.portfolioSnapshots.bulkPut(data.portfolioSnapshots)
        await db.appSettings.bulkPut(data.appSettings)
        await db.metadata.bulkPut(data.metadata)
      }
    )
}
