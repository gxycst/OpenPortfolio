import { accountRepository } from '@/repositories/accountRepository'
import { positionRepository } from '@/repositories/positionRepository'
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
  remove: async (id: string) => {
    const account = await accountRepository.get(id)
    const positions = await positionRepository.listByAccount(id)
    const activePositions = positions.filter((position) => !position.isClosed)
    if (activePositions.length > 0) {
      throw new Error(`账户「${account?.name ?? '当前账户'}」下仍有资产，请先清空该账户名下的资产后再删除`)
    }
    await accountRepository.delete(id)
  }
}
