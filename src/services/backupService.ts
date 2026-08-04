import { backupRepository } from '@/repositories/backupRepository'
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

export interface BackupFile {
  format: 'openportfolio-backup'
  schemaVersion: 1
  appVersion: string
  exportedAt: string
  data: {
    accounts: Account[]
    assets: Asset[]
    positions: Position[]
    prices: Price[]
    exchangeRates: ExchangeRate[]
    portfolioSnapshots: PortfolioSnapshot[]
    appSettings: AppSetting[]
    metadata: Metadata[]
  }
}

export const backupService = {
  exportBackup: async (): Promise<BackupFile> => ({
    format: 'openportfolio-backup',
    schemaVersion: 1,
    appVersion: '0.1.0',
    exportedAt: new Date().toISOString(),
    data: await backupRepository.exportAll()
  }),
  importBackup: async (backup: unknown) => {
    const parsed = validateBackup(backup)
    await backupRepository.replaceAll(parsed.data)
  }
}

export function validateBackup(input: unknown): BackupFile {
  if (!isRecord(input)) throw new Error('备份文件格式不正确')
  if (input.format !== 'openportfolio-backup') throw new Error('不是 OpenPortfolio 备份文件')
  if (input.schemaVersion !== 1) throw new Error('不支持的备份版本')
  if (!isRecord(input.data)) throw new Error('备份文件缺少 data')
  const data = input.data
  const requiredArrays = [
    'accounts',
    'assets',
    'positions',
    'prices',
    'exchangeRates',
    'portfolioSnapshots',
    'appSettings',
    'metadata'
  ]
  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) throw new Error(`备份文件缺少 ${key}`)
  }
  return input as unknown as BackupFile
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
