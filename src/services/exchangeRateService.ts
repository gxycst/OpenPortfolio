import { fetchLatestExchangeRate } from '@/providers/exchangeRates/frankfurterProvider'
import { exchangeRateRepository } from '@/repositories/exchangeRateRepository'
import type { ExchangeRate } from '@/types/domain'

const RATE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000

export const exchangeRateService = {
  list: () => exchangeRateRepository.list(),
  getUsdToCny: () => exchangeRateRepository.getPair('USD', 'CNY'),
  ensureCoreRates: async () => {
    await Promise.allSettled([exchangeRateService.ensureRate('USD'), exchangeRateService.ensureRate('HKD')])
  },
  ensureRate: async (baseCurrency: 'USD' | 'HKD') => {
    const current = await exchangeRateRepository.getPair(baseCurrency, 'CNY')
    if (current && Date.now() - new Date(current.fetchedAt).getTime() < RATE_REFRESH_INTERVAL_MS) {
      return current
    }
    try {
      return await exchangeRateService.refreshRate(baseCurrency)
    } catch {
      return current
    }
  },
  refreshRate: async (baseCurrency: 'USD' | 'HKD') => {
    const current = await exchangeRateRepository.getPair(baseCurrency, 'CNY')
    const latest = await fetchLatestExchangeRate(baseCurrency, 'CNY')
    const exchangeRate: ExchangeRate = {
      ...latest,
      id: current?.id ?? `fx_${baseCurrency.toLowerCase()}_cny`,
      createdAt: current?.createdAt ?? latest.createdAt
    }
    await exchangeRateRepository.put(exchangeRate)
    return exchangeRate
  }
}
