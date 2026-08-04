import { db } from '@/database/database'
import type { Price } from '@/types/domain'

export const priceRepository = {
  list: () => db.prices.toArray(),
  getByAsset: (assetId: string) => db.prices.where('assetId').equals(assetId).first(),
  put: (price: Price) => db.prices.put(price)
}
