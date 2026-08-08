import { describe, expect, it } from 'vitest'
import { demoBackupData } from '@/data/demoBackup'
import { validateBackup } from '@/services/backupService'

describe('backup validation', () => {
  it('accepts a v1 backup envelope', () => {
    const backup = {
      format: 'openportfolio-backup',
      schemaVersion: 1,
      appVersion: '0.1.0',
      exportedAt: '2026-08-04T00:00:00.000Z',
      data: {
        accounts: [],
        assets: [],
        positions: [],
        prices: [],
        exchangeRates: [],
        portfolioSnapshots: [],
        appSettings: [],
        metadata: []
      }
    }

    expect(validateBackup(backup)).toBe(backup)
  })

  it('rejects unknown formats', () => {
    expect(() => validateBackup({ format: 'other' })).toThrow('不是 OpenPortfolio 备份文件')
  })

  it('keeps bundled demo data in the supported backup shape', () => {
    const backup = {
      format: 'openportfolio-backup',
      schemaVersion: 1,
      appVersion: '0.1.0',
      exportedAt: '2026-08-08T00:00:00.000Z',
      data: demoBackupData
    }

    expect(validateBackup(backup)).toBe(backup)
    expect(demoBackupData.accounts.length).toBeGreaterThan(0)
    expect(demoBackupData.positions.length).toBeGreaterThan(0)
  })
})
