import { defineStore } from 'pinia'
import { accountService, type AccountInput } from '@/services/accountService'
import { backupService } from '@/services/backupService'
import { exchangeRateService } from '@/services/exchangeRateService'
import { portfolioService } from '@/services/portfolioService'
import { priceService } from '@/services/priceService'
import { positionService, type PositionInput } from '@/services/positionService'
import type { Account, Asset, ExchangeRate, PortfolioSummary, Position, Price } from '@/types/domain'

export const usePortfolioStore = defineStore('portfolio', {
  state: () => ({
    accounts: [] as Account[],
    positions: [] as Position[],
    assets: [] as Asset[],
    prices: [] as Price[],
    exchangeRates: [] as ExchangeRate[],
    summary: undefined as PortfolioSummary | undefined,
    isDemoData: false,
    loading: false,
    error: ''
  }),
  actions: {
    async refresh() {
      this.loading = true
      this.error = ''
      try {
        await backupService.ensureDemoDataIfEmpty()
        await exchangeRateService.ensureCoreRates()
        await Promise.allSettled([priceService.refreshStaleFundPrices(), priceService.refreshStaleStockPrices()])
        const [accounts, positionData, exchangeRates, summary, isDemoData] = await Promise.all([
          accountService.list(),
          positionService.list(),
          exchangeRateService.list(),
          portfolioService.summarize(),
          backupService.isDemoDataActive()
        ])
        this.accounts = accounts
        this.positions = positionData.positions
        this.assets = positionData.assets
        this.prices = positionData.prices
        this.exchangeRates = exchangeRates
        this.summary = summary
        this.isDemoData = isDemoData
      } catch (error) {
        this.error = error instanceof Error ? error.message : '加载失败'
      } finally {
        this.loading = false
      }
    },
    async saveAccount(input: AccountInput, id?: string) {
      return this.runAndRefresh(() => accountService.save(input, id))
    },
    async removeAccount(id: string) {
      await this.runAndRefresh(() => accountService.remove(id))
    },
    async removeAccounts(ids: string[]) {
      await this.runAndRefresh(async () => {
        await Promise.all(ids.map((id) => accountService.remove(id)))
      })
    },
    async savePosition(input: PositionInput, id?: string) {
      await this.runAndRefresh(() => positionService.save(input, id))
    },
    async removePosition(id: string) {
      await this.runAndRefresh(() => positionService.remove(id))
    },
    async removePositions(ids: string[]) {
      await this.runAndRefresh(async () => {
        await Promise.all(ids.map((id) => positionService.remove(id)))
      })
    },
    async refreshFundPrices() {
      await this.runAndRefresh(() => priceService.refreshAllFundPrices())
    },
    async refreshFundPricesByAssetIds(assetIds: string[]) {
      await this.runAndRefresh(() => priceService.refreshFundPricesByAssetIds(assetIds))
    },
    exportBackup: () => backupService.exportBackup(),
    async importBackup(input: unknown) {
      await this.runAndRefresh(() => backupService.importBackup(input))
    },
    async clearLocalData() {
      await this.runAndRefresh(() => backupService.clearLocalData())
    },
    async runAndRefresh<T>(action: () => Promise<T>): Promise<T> {
      this.error = ''
      try {
        const result = await action()
        await this.refresh()
        return result
      } catch (error) {
        this.error = error instanceof Error ? error.message : '操作失败'
        throw error
      }
    }
  }
})
