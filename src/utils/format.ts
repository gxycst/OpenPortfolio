import type { CurrencyCode } from '@/types/domain'

export function formatCurrency(value: number | undefined, currency: CurrencyCode): string {
  if (value === undefined || Number.isNaN(value)) return '缺失'
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency === 'OTHER' ? 'CNY' : currency,
    maximumFractionDigits: 2
  }).format(value)
}

export function formatPercent(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '缺失'
  return `${(value * 100).toFixed(2)}%`
}
