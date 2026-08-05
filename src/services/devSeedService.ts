import { accountRepository } from '@/repositories/accountRepository'
import { assetRepository } from '@/repositories/assetRepository'
import { positionRepository } from '@/repositories/positionRepository'
import { priceRepository } from '@/repositories/priceRepository'
import type { Account, Asset, Position, Price } from '@/types/domain'
import { nowIso, todayLocalDate } from '@/utils/date'

const STOCK_SCROLL_ACCOUNT_ID = 'acc_test_stock_scroll'
const TEST_STOCK_ASSET_PREFIX = 'asset_test_stock_'
const TEST_STOCK_POSITION_PREFIX = 'pos_test_stock_'

export const devSeedService = {
  seedStockScrollTest: async (count = 50) => {
    const now = nowIso()
    const today = todayLocalDate()
    const account: Account = {
      id: STOCK_SCROLL_ACCOUNT_ID,
      name: '测试股票账户',
      type: 'cn_stock',
      defaultCurrency: 'CNY',
      market: 'CN',
      isArchived: false,
      sortOrder: Date.now(),
      createdAt: now,
      updatedAt: now
    }

    await accountRepository.put(account)

    await Promise.all(
      Array.from({ length: count }, async (_, index) => {
        const serial = `${index + 1}`.padStart(3, '0')
        const assetId = `asset_test_stock_${serial}`
        const symbol = `60${serial}0`
        const quantity = 100 + index * 10
        const averageCost = 8 + index * 0.35
        const currentPrice = averageCost * (index % 3 === 0 ? 0.88 : 1.08 + index * 0.004)
        const asset: Asset = {
          id: assetId,
          symbol,
          name: `测试股票${serial}`,
          assetType: 'stock',
          market: 'CN',
          currency: 'CNY',
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
        const position: Position = {
          id: `pos_test_stock_${serial}`,
          accountId: STOCK_SCROLL_ACCOUNT_ID,
          assetId,
          quantity,
          averageCost,
          costCurrency: 'CNY',
          priceMode: 'auto',
          isClosed: false,
          createdAt: now,
          updatedAt: now
        }
        const price: Price = {
          id: `price_${assetId}`,
          assetId,
          price: currentPrice,
          currency: 'CNY',
          priceType: 'market',
          providerId: 'dev_seed',
          priceDate: today,
          fetchedAt: now,
          delayed: true,
          status: 'valid',
          createdAt: now,
          updatedAt: now
        }

        await assetRepository.put(asset)
        await positionRepository.put(position)
        await priceRepository.put(price)
      })
    )
  },
  clearStockScrollTest: async () => {
    const [assets, positions, prices] = await Promise.all([
      assetRepository.list(),
      positionRepository.listAll(),
      priceRepository.list()
    ])
    const testAssetIds = assets
      .filter((asset) => asset.id.startsWith(TEST_STOCK_ASSET_PREFIX))
      .map((asset) => asset.id)
    const testPositionIds = positions
      .filter(
        (position) =>
          position.id.startsWith(TEST_STOCK_POSITION_PREFIX) ||
          position.accountId === STOCK_SCROLL_ACCOUNT_ID ||
          testAssetIds.includes(position.assetId)
      )
      .map((position) => position.id)
    const testPriceIds = prices
      .filter(
        (price) =>
          price.providerId === 'dev_seed' ||
          price.id.startsWith(`price_${TEST_STOCK_ASSET_PREFIX}`) ||
          testAssetIds.includes(price.assetId)
      )
      .map((price) => price.id)

    await Promise.all([
      accountRepository.delete(STOCK_SCROLL_ACCOUNT_ID),
      ...testPositionIds.map((id) => positionRepository.delete(id)),
      ...testPriceIds.map((id) => priceRepository.delete(id)),
      ...testAssetIds.map((id) => assetRepository.delete(id))
    ])

    return {
      accounts: 1,
      assets: testAssetIds.length,
      positions: testPositionIds.length,
      prices: testPriceIds.length
    }
  }
}
