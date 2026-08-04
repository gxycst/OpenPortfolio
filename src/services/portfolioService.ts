import { accountRepository } from '@/repositories/accountRepository'
import { assetRepository } from '@/repositories/assetRepository'
import { exchangeRateRepository } from '@/repositories/exchangeRateRepository'
import { positionRepository } from '@/repositories/positionRepository'
import { priceRepository } from '@/repositories/priceRepository'
import { calculatePortfolioSummary } from '@/calculations/portfolioSummary'

export const portfolioService = {
  summarize: async () => {
    const [accounts, assets, positions, prices, rates] = await Promise.all([
      accountRepository.list(),
      assetRepository.list(),
      positionRepository.list(),
      priceRepository.list(),
      exchangeRateRepository.list()
    ])
    return calculatePortfolioSummary({ accounts, assets, positions, prices, rates })
  }
}
