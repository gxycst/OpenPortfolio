import { backupRepository } from '@/repositories/backupRepository'
import { demoBackupData } from '@/data/demoBackup'
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
  ensureDemoDataIfEmpty: async () => {
    const [hasAnyUserData, hasDemoClearedFlag] = await Promise.all([
      backupRepository.hasAnyUserData(),
      backupRepository.hasDemoClearedFlag()
    ])
    if (hasAnyUserData || hasDemoClearedFlag) return
    const now = new Date().toISOString()
    await backupRepository.replaceAll({
      ...demoBackupData,
      metadata: [
        ...demoBackupData.metadata,
        {
          key: 'demoDataLoadedAt',
          value: now,
          updatedAt: now
        }
      ]
    })
  },
  isDemoDataActive: async () => {
    const [metadata, data] = await Promise.all([backupRepository.getMetadata(), backupRepository.exportAll()])
    if (metadata.some((item) => item.key === 'demoDataClearedAt')) return false
    if (metadata.some((item) => item.key === 'demoDataLoadedAt')) return true
    return isBundledDemoData(data)
  },
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
  },
  clearLocalData: async () => {
    const now = new Date().toISOString()
    await backupRepository.clearAll([
      {
        key: 'demoDataClearedAt',
        value: now,
        updatedAt: now
      }
    ])
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

export function isBundledDemoData(data: Pick<BackupFile['data'], 'accounts' | 'assets' | 'positions'>): boolean {
  return hasSameIds(data.accounts, demoBackupData.accounts) &&
    hasSameIds(data.assets, demoBackupData.assets) &&
    hasSameIds(data.positions, demoBackupData.positions)
}

function hasSameIds(left: Array<{ id: string }>, right: Array<{ id: string }>): boolean {
  if (left.length !== right.length) return false
  const rightIds = new Set(right.map((item) => item.id))
  return left.every((item) => rightIds.has(item.id))
}
