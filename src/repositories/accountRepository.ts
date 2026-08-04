import { db } from '@/database/database'
import type { Account } from '@/types/domain'

export const accountRepository = {
  list: () => db.accounts.orderBy('sortOrder').toArray(),
  get: (id: string) => db.accounts.get(id),
  add: (account: Account) => db.accounts.add(account),
  put: (account: Account) => db.accounts.put(account),
  delete: (id: string) => db.accounts.delete(id)
}
