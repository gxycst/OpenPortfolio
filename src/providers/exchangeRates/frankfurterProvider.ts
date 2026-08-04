import type { ExchangeRate } from '@/types/domain'
import { nowIso } from '@/utils/date'
import { createId } from '@/utils/identifiers'

interface FrankfurterRateResponse {
  date: string
  base: string
  quote: string
  rate: number
}

export async function fetchLatestUsdToCnyRate(): Promise<ExchangeRate> {
  return fetchLatestExchangeRate('USD', 'CNY')
}

export async function fetchLatestExchangeRate(baseCurrency: 'USD' | 'HKD', quoteCurrency: 'CNY'): Promise<ExchangeRate> {
  const response = await fetch(`https://api.frankfurter.dev/v2/rate/${baseCurrency}/${quoteCurrency}`)
  if (!response.ok) throw new Error('公开汇率获取失败')

  const data = (await response.json()) as FrankfurterRateResponse
  if (
    data.base !== baseCurrency ||
    data.quote !== quoteCurrency ||
    !Number.isFinite(data.rate) ||
    data.rate <= 0
  ) {
    throw new Error('公开汇率响应格式不正确')
  }

  const now = nowIso()
  return {
    id: createId('fx'),
    baseCurrency,
    quoteCurrency,
    rate: data.rate,
    providerId: 'frankfurter',
    rateDate: data.date,
    fetchedAt: now,
    status: 'valid',
    createdAt: now,
    updatedAt: now
  }
}
