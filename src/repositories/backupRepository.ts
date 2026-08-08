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
  hasAnyUserData: async (): Promise<boolean> => {
    const [accounts, assets, positions, prices, snapshots] = await Promise.all([
      db.accounts.count(),
      db.assets.count(),
      db.positions.count(),
      db.prices.count(),
      db.portfolioSnapshots.count()
    ])
    return accounts + assets + positions + prices + snapshots > 0
  },
  hasDemoClearedFlag: async (): Promise<boolean> => Boolean(await db.metadata.get('demoDataClearedAt')),
  getMetadata: () => db.metadata.toArray(),
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
  clearAll: async (metadata: Metadata[] = []) =>
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
        if (metadata.length > 0) {
          await db.metadata.bulkPut(metadata)
        }
      }
    ),
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
