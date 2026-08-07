import { beforeEach, describe, expect, it, vi } from 'vitest'
import { positionService } from '@/services/positionService'

vi.mock('@/repositories/assetRepository', () => ({
  assetRepository: {
    findByNaturalKey: vi.fn(),
    put: vi.fn()
  }
}))

vi.mock('@/repositories/positionRepository', () => ({
  positionRepository: {
    findByAccountAsset: vi.fn(),
    listAll: vi.fn(),
    put: vi.fn()
  }
}))

vi.mock('@/repositories/priceRepository', () => ({
  priceRepository: {
    put: vi.fn()
  }
}))

describe('position service validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects fund profit that is greater than or equal to market value', async () => {
    await expect(
      positionService.save({
        accountId: 'acc_fund',
        assetType: 'fund',
        symbol: '000001',
        name: '示例基金',
        market: 'FUND_CN',
        currency: 'CNY',
        quantity: 100,
        holdingProfit: 400,
        currentPrice: 1.1877
      })
    ).rejects.toThrow('持有收益不能大于或等于当前市值')
  })
})
