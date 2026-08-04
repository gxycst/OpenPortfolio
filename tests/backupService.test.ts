import { describe, expect, it } from 'vitest'
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
})
