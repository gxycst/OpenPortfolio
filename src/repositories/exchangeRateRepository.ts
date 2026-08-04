import { db } from '@/database/database'
import type { CurrencyCode, ExchangeRate } from '@/types/domain'

export const exchangeRateRepository = {
  list: () => db.exchangeRates.toArray(),
  getPair: (baseCurrency: CurrencyCode, quoteCurrency: CurrencyCode) =>
    db.exchangeRates.where('[baseCurrency+quoteCurrency]').equals([baseCurrency, quoteCurrency]).first(),
  put: (rate: ExchangeRate) => db.exchangeRates.put(rate)
}
