import { db } from '@/database/database'
import type { Position } from '@/types/domain'

export const positionRepository = {
  list: () => db.positions.filter((position) => !position.isClosed).toArray(),
  listAll: () => db.positions.toArray(),
  listByAccount: (accountId: string) => db.positions.where('accountId').equals(accountId).toArray(),
  findByAccountAsset: (accountId: string, assetId: string) =>
    db.positions.where('[accountId+assetId]').equals([accountId, assetId]).first(),
  put: (position: Position) => db.positions.put(position),
  delete: (id: string) => db.positions.delete(id)
}
