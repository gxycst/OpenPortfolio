import { assetRepository } from '@/repositories/assetRepository'
import { positionRepository } from '@/repositories/positionRepository'
import { priceRepository } from '@/repositories/priceRepository'
import type { Asset, AssetType, CurrencyCode, MarketCode, Position, PriceType } from '@/types/domain'
import { nowIso, todayLocalDate } from '@/utils/date'
import { createId } from '@/utils/identifiers'

export interface PositionInput {
  accountId: string
  assetType: AssetType
  symbol: string
  name: string
  market: MarketCode
  currency: CurrencyCode
  quantity: number
  averageCost?: number
  holdingProfit?: number
  currentPrice?: number
  priceDate?: string
  priceProviderId?: string
  note?: string
}

export const positionService = {
  list: async () => {
    const [positions, assets, prices] = await Promise.all([
      positionRepository.list(),
      assetRepository.list(),
      priceRepository.list()
    ])
    return { positions, assets, prices }
  },
  save: async (input: PositionInput, id?: string) => {
    validatePositionInput(input)
    const now = nowIso()
    const symbol = input.symbol.trim().toUpperCase()
    const asset = await findOrCreateAsset({
      symbol,
      name: input.name.trim(),
      assetType: input.assetType,
      market: input.market,
      currency: input.currency
    })
    const duplicate = id ? undefined : await positionRepository.findByAccountAsset(input.accountId, asset.id)
    const existing = id
      ? await positionRepository.listAll().then((items) => items.find((item) => item.id === id))
      : duplicate?.isClosed
        ? undefined
        : duplicate
    const averageCost = resolveAverageCost(input)
    const position: Position = {
      id: existing?.id ?? id ?? createId('pos'),
      accountId: input.accountId,
      assetId: asset.id,
      quantity: input.quantity,
      averageCost,
      costCurrency: input.currency,
      priceMode: input.assetType === 'cash' ? 'manual' : 'auto',
      manualPrice: input.assetType === 'cash' ? 1 : undefined,
      manualPriceDate: input.assetType === 'cash' ? todayLocalDate() : undefined,
      note: input.note?.trim() || undefined,
      isClosed: false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    await positionRepository.put(position)
    if (input.assetType !== 'cash' && input.currentPrice !== undefined) {
      await priceRepository.put({
        id: `price_${asset.id}`,
        assetId: asset.id,
        price: input.currentPrice,
        currency: input.currency,
        priceType: priceTypeFor(input.assetType),
        providerId: input.priceProviderId ?? 'manual',
        priceDate: input.priceDate ?? todayLocalDate(),
        fetchedAt: now,
        delayed: false,
        status: 'valid',
        createdAt: now,
        updatedAt: now
      })
    }
    return position
  },
  remove: (id: string) => positionRepository.delete(id)
}

async function findOrCreateAsset(input: Pick<Asset, 'symbol' | 'name' | 'assetType' | 'market' | 'currency'>): Promise<Asset> {
  const existing = await assetRepository.findByNaturalKey(input.market, input.symbol, input.currency)
  if (existing) return existing
  const now = nowIso()
  const asset: Asset = {
    id: createId('asset'),
    symbol: input.symbol,
    name: input.name,
    assetType: input.assetType,
    market: input.market,
    currency: input.currency,
    fundShareClass: input.assetType === 'fund' ? input.currency : undefined,
    isActive: true,
    createdAt: now,
    updatedAt: now
  }
  await assetRepository.put(asset)
  return asset
}

function validatePositionInput(input: PositionInput): void {
  if (!input.accountId) throw new Error('请选择账户')
  if (!input.symbol.trim()) throw new Error('资产代码不能为空')
  if (!input.name.trim()) throw new Error('资产名称不能为空')
  if (!Number.isFinite(input.quantity) || input.quantity < 0) throw new Error('数量不能为负数')
  if (input.averageCost !== undefined && (!Number.isFinite(input.averageCost) || input.averageCost < 0)) {
    throw new Error('成本价不能为负数')
  }
  if (input.holdingProfit !== undefined && !Number.isFinite(input.holdingProfit)) {
    throw new Error('持有收益必须是有效数字')
  }
  if (input.assetType !== 'cash' && (input.currentPrice === undefined || input.currentPrice < 0)) {
    throw new Error('非现金资产需要录入当前价格')
  }
}

function resolveAverageCost(input: PositionInput): number {
  if (input.assetType === 'cash') return 1
  if (input.assetType === 'fund' && input.holdingProfit !== undefined && input.currentPrice !== undefined) {
    if (input.quantity <= 0) return 0
    const marketValue = input.quantity * input.currentPrice
    const totalCost = marketValue - input.holdingProfit
    return totalCost > 0 ? totalCost / input.quantity : 0
  }
  return input.averageCost ?? 0
}

function priceTypeFor(assetType: AssetType): PriceType {
  if (assetType === 'fund') return 'nav'
  return assetType === 'cash' ? 'fixed' : 'market'
}
