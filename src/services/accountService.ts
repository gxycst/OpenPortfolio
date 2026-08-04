import { accountRepository } from '@/repositories/accountRepository'
import type { Account, AccountType, CurrencyCode, MarketCode } from '@/types/domain'
import { currencyForAccountType, marketForAccountType } from '@/utils/accountType'
import { nowIso } from '@/utils/date'
import { createId } from '@/utils/identifiers'

export interface AccountInput {
  name: string
  type: AccountType
  institution?: string
  defaultCurrency?: CurrencyCode
  market?: MarketCode
  note?: string
}

export const accountService = {
  list: () => accountRepository.list(),
  save: async (input: AccountInput, id?: string) => {
    const name = input.name.trim()
    if (!name) throw new Error('账户名称不能为空')
    const now = nowIso()
    const existing = id ? await accountRepository.get(id) : undefined
    const account: Account = {
      id: id ?? createId('acc'),
      name,
      type: input.type,
      defaultCurrency: currencyForAccountType(input.type),
      market: marketForAccountType(input.type),
      isArchived: existing?.isArchived ?? false,
      sortOrder: existing?.sortOrder ?? Date.now(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    await accountRepository.put(account)
    return account
  },
  remove: (id: string) => accountRepository.delete(id)
}
