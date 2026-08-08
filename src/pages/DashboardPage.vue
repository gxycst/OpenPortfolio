<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { AssetType, CurrencyCode, SummaryItem } from '@/types/domain'
import { formatCurrency, formatPercent } from '@/utils/format'

const store = usePortfolioStore()
onMounted(() => store.refresh())

const currencyLabels: Record<CurrencyCode, string> = {
  CNY: '人民币',
  USD: '美元',
  HKD: '港元',
  JPY: '日元',
  EUR: '欧元',
  GBP: '英镑',
  OTHER: '其他'
}

const assetTypeLabels: Record<AssetType, string> = {
  stock: '股票',
  etf: 'ETF',
  fund: '基金',
  cash: '现金',
  bond: '债券',
  commodity: '商品',
  crypto: '加密资产',
  other: '其他'
}

const usdToCnyRate = computed(() =>
  store.exchangeRates.find((rate) => rate.baseCurrency === 'USD' && rate.quoteCurrency === 'CNY')
)
const hkdToCnyRate = computed(() =>
  store.exchangeRates.find((rate) => rate.baseCurrency === 'HKD' && rate.quoteCurrency === 'CNY')
)
const currencyBreakdown = computed(() => sortBreakdown(store.summary?.currencyBreakdown ?? []))
const currencyChartItems = computed(() =>
  toChartItems(
    currencyBreakdown.value.map((item) => ({
      ...item,
      name: currencyLabels[item.key as CurrencyCode] ?? item.name
    }))
  )
)
const assetTypeBreakdown = computed(() =>
  sortBreakdown(store.summary?.assetTypeBreakdown ?? []).map((item) => ({
    ...item,
    name: assetTypeLabels[item.key as AssetType] ?? item.name
  }))
)
const assetTypeChartItems = computed(() => toChartItems(assetTypeBreakdown.value))
const accountBreakdown = computed(() => sortBreakdown(store.summary?.accountBreakdown ?? []))
const accountChartItems = computed(() => toChartItems(accountBreakdown.value))
const rawCurrencyTotals = computed(() => {
  const entries = store.summary?.rawCurrencyBreakdown ?? []
  return new Map(entries.map((item) => [item.currency, item.value]))
})
const rawCurrencyProfits = computed(() => {
  const entries = store.summary?.rawCurrencyBreakdown ?? []
  return new Map(entries.map((item) => [item.currency, item.profitLoss]))
})

function sortBreakdown(items: SummaryItem[]): SummaryItem[] {
  return [...items].sort((a, b) => b.valueCNY - a.valueCNY)
}

const chartColors = ['#059669', '#1d4ed8', '#be185d', '#d97706', '#64748b', '#94a3b8']

type ChartItem = SummaryItem & { color: string }

function toChartItems(items: SummaryItem[]): ChartItem[] {
  const visible = items.slice(0, 5)
  const rest = items.slice(5)
  const merged = rest.length
    ? [
        ...visible,
        {
          key: 'other',
          name: '其他',
          valueCNY: rest.reduce((sum, item) => sum + item.valueCNY, 0),
          valueUSD: rest.reduce((sum, item) => sum + item.valueUSD, 0),
          percentage: rest.reduce((sum, item) => sum + item.percentage, 0)
        }
      ]
    : visible
  return merged.map((item, index) => ({
    ...item,
    color: chartColors[index % chartColors.length]
  }))
}

function chartBackground(items: ChartItem[]): string {
  if (items.length === 0) return '#eef3f7'
  let start = 0
  const segments = items.map((item) => {
    const end = start + item.percentage * 100
    const segment = `${item.color} ${start}% ${end}%`
    start = end
    return segment
  })
  return `conic-gradient(${segments.join(', ')})`
}

function profitClass(value: number | undefined) {
  return { positive: (value ?? 0) >= 0, negative: (value ?? 0) < 0 }
}
</script>

<template>
  <section class="page">
    <section v-if="store.isDemoData" class="demo-notice">
      <div>
        <strong>当前展示的是模拟数据</strong>
        <span>你可以点击顶部“清空数据”后，开始录入自己的真实资产。</span>
      </div>
    </section>

    <section v-if="store.summary" class="card asset-total-panel">
      <div class="asset-total-grid">
        <article class="metric asset-total currency-total cny-total">
          <span class="currency-code">CNY</span>
          <span>人民币总值</span>
          <strong>{{ formatCurrency(store.summary.totalValueCNY, 'CNY') }}</strong>
          <em :class="profitClass(store.summary.totalProfitCNY)">盈亏 {{ formatCurrency(store.summary.totalProfitCNY, 'CNY') }}</em>
          <small>基础统计口径</small>
        </article>
        <article class="metric asset-total currency-total usd-total">
          <span class="currency-code">USD</span>
          <span>美元总值</span>
          <strong>{{ formatCurrency(store.summary.totalValueUSD, 'USD') }}</strong>
          <em :class="profitClass(store.summary.totalProfitUSD)">盈亏 {{ formatCurrency(store.summary.totalProfitUSD, 'USD') }}</em>
          <small>按当前汇率折算</small>
        </article>
        <article class="metric asset-total currency-total hkd-total">
          <span class="currency-code">HKD</span>
          <span>港元总值</span>
          <strong>{{ formatCurrency(store.summary.totalValueHKD, 'HKD') }}</strong>
          <em :class="profitClass(store.summary.totalProfitHKD)">盈亏 {{ formatCurrency(store.summary.totalProfitHKD, 'HKD') }}</em>
          <small>按当前汇率折算</small>
        </article>
      </div>
      <p class="rate-inline">
        <span>当前使用汇率</span>
        <strong v-if="usdToCnyRate">USD/CNY {{ usdToCnyRate.rate.toFixed(4) }} · {{ usdToCnyRate.rateDate }}</strong>
        <strong v-if="hkdToCnyRate">HKD/CNY {{ hkdToCnyRate.rate.toFixed(4) }} · {{ hkdToCnyRate.rateDate }}</strong>
        <strong v-if="!usdToCnyRate && !hkdToCnyRate">暂无可用汇率</strong>
      </p>
    </section>

    <section v-if="store.summary" class="card native-total-panel">
      <div class="asset-total-grid">
      <article class="metric native-total cny-total">
        <span class="currency-code">CNY</span>
        <span>原始人民币总值</span>
        <strong>{{ formatCurrency(rawCurrencyTotals.get('CNY') ?? 0, 'CNY') }}</strong>
        <em :class="profitClass(rawCurrencyProfits.get('CNY'))">盈亏 {{ formatCurrency(rawCurrencyProfits.get('CNY') ?? 0, 'CNY') }}</em>
      </article>
      <article class="metric native-total usd-total">
        <span class="currency-code">USD</span>
        <span>原始美元总值</span>
        <strong>{{ formatCurrency(rawCurrencyTotals.get('USD') ?? 0, 'USD') }}</strong>
        <em :class="profitClass(rawCurrencyProfits.get('USD'))">盈亏 {{ formatCurrency(rawCurrencyProfits.get('USD') ?? 0, 'USD') }}</em>
      </article>
      <article class="metric native-total hkd-total">
        <span class="currency-code">HKD</span>
        <span>原始港元总值</span>
        <strong>{{ formatCurrency(rawCurrencyTotals.get('HKD') ?? 0, 'HKD') }}</strong>
        <em :class="profitClass(rawCurrencyProfits.get('HKD'))">盈亏 {{ formatCurrency(rawCurrencyProfits.get('HKD') ?? 0, 'HKD') }}</em>
      </article>
      </div>
      <p class="rate-inline">
        <span>不经过汇率折算</span>
      </p>
    </section>

    <div v-if="store.summary" class="grid three">
      <article class="card breakdown-card">
        <div class="breakdown-header">
          <h3>币种分布</h3>
          <span>按人民币折算</span>
        </div>
        <div v-if="currencyChartItems.length" class="donut-layout">
          <div class="donut-chart" :style="{ background: chartBackground(currencyChartItems) }">
            <span>{{ formatPercent(currencyChartItems[0]?.percentage) }}</span>
          </div>
          <div class="donut-legend">
            <div v-for="item in currencyChartItems" :key="item.key" class="donut-legend-item">
              <i :style="{ background: item.color }"></i>
              <strong>{{ item.name }}</strong>
              <span>{{ formatPercent(item.percentage) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="breakdown-empty">暂无可统计资产</p>
      </article>

      <article class="card breakdown-card">
        <div class="breakdown-header">
          <h3>资产类型分布</h3>
          <span>股票 / 基金 / 现金</span>
        </div>
        <div v-if="assetTypeChartItems.length" class="donut-layout">
          <div class="donut-chart" :style="{ background: chartBackground(assetTypeChartItems) }">
            <span>{{ formatPercent(assetTypeChartItems[0]?.percentage) }}</span>
          </div>
          <div class="donut-legend">
            <div v-for="item in assetTypeChartItems" :key="item.key" class="donut-legend-item">
              <i :style="{ background: item.color }"></i>
              <strong>{{ item.name }}</strong>
              <span>{{ formatPercent(item.percentage) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="breakdown-empty">暂无可统计资产</p>
      </article>

      <article class="card breakdown-card">
        <div class="breakdown-header">
          <h3>账户分布</h3>
          <span>按账户汇总</span>
        </div>
        <div v-if="accountChartItems.length" class="donut-layout">
          <div class="donut-chart" :style="{ background: chartBackground(accountChartItems) }">
            <span>{{ formatPercent(accountChartItems[0]?.percentage) }}</span>
          </div>
          <div class="donut-legend">
            <div v-for="item in accountChartItems" :key="item.key" class="donut-legend-item">
              <i :style="{ background: item.color }"></i>
              <strong>{{ item.name }}</strong>
              <span>{{ formatPercent(item.percentage) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="breakdown-empty">暂无可统计资产</p>
      </article>
    </div>

    <div v-if="store.summary?.missingPriceCount" class="notice">
      有 {{ store.summary.missingPriceCount }} 条持仓缺少价格，未计入当前总市值。
    </div>

  </section>
</template>
