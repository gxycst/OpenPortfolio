import { db } from '@/database/database'
import type { Asset, CurrencyCode, MarketCode } from '@/types/domain'

export const assetRepository = {
  list: () => db.assets.toArray(),
  get: (id: string) => db.assets.get(id),
  findByNaturalKey: (market: MarketCode, symbol: string, currency: CurrencyCode) =>
    db.assets.where('[market+symbol+currency]').equals([market, symbol, currency]).first(),
  put: (asset: Asset) => db.assets.put(asset)
}
