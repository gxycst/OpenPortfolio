import type { Account, AccountType, CurrencyCode, MarketCode } from '@/types/domain'

export const accountTypeLabels: Record<AccountType, string> = {
  cn_stock: 'A股',
  us_stock: '美股',
  hk_stock: '港股',
  usd_fund: '美元基金',
  hkd_fund: '港元基金',
  cny_fund: '人民币基金',
  usd_cash: '美元现金',
  hkd_cash: '港元现金',
  cny_cash: '人民币现金',
  china_broker: 'A股',
  us_broker: '美股',
  fund_platform: '人民币基金',
  bank: '人民币现金',
  cash: '人民币现金',
  other: '其他'
}

export const stockAccountTypes: AccountType[] = ['cn_stock', 'us_stock', 'hk_stock', 'china_broker', 'us_broker']
export const fundAccountTypes: AccountType[] = ['usd_fund', 'hkd_fund', 'cny_fund', 'fund_platform']
export const cashAccountTypes: AccountType[] = ['usd_cash', 'hkd_cash', 'cny_cash', 'bank', 'cash']

export function currencyForAccountType(type: AccountType): CurrencyCode {
  if (type === 'us_stock' || type === 'usd_fund' || type === 'usd_cash' || type === 'us_broker') return 'USD'
  if (type === 'hk_stock' || type === 'hkd_fund' || type === 'hkd_cash') return 'HKD'
  return 'CNY'
}

export function marketForAccountType(type: AccountType): MarketCode {
  if (type === 'us_stock' || type === 'us_broker') return 'US'
  if (type === 'hk_stock') return 'HK'
  if (type === 'usd_fund' || type === 'hkd_fund' || type === 'cny_fund' || type === 'fund_platform') return 'FUND_CN'
  if (cashAccountTypes.includes(type)) return 'CASH'
  return 'CN'
}

export function accountMatchesTypes(account: Account, types: AccountType[]): boolean {
  return types.includes(account.type)
}
