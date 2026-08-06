<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { formatCurrency } from '@/utils/format'

const store = usePortfolioStore()
onMounted(() => store.refresh())

const usdToCnyRate = computed(() =>
  store.exchangeRates.find((rate) => rate.baseCurrency === 'USD' && rate.quoteCurrency === 'CNY')
)
const hkdToCnyRate = computed(() =>
  store.exchangeRates.find((rate) => rate.baseCurrency === 'HKD' && rate.quoteCurrency === 'CNY')
)
</script>

<template>
  <section class="page">
    <div v-if="store.summary" class="grid two">
      <article class="card metric asset-total">
        <span>资产总值 · 人民币</span>
        <strong>{{ formatCurrency(store.summary.totalValueCNY, 'CNY') }}</strong>
      </article>
      <article class="card metric asset-total">
        <span>资产总值 · 美元</span>
        <strong>{{ formatCurrency(store.summary.totalValueUSD, 'USD') }}</strong>
      </article>
    </div>

    <div v-if="store.summary" class="grid three">
      <article class="card metric">
        <span>总持仓成本 · 人民币</span>
        <strong>{{ formatCurrency(store.summary.totalCostCNY, 'CNY') }}</strong>
      </article>
      <article class="card metric">
        <span>总浮动盈亏 · 人民币</span>
        <strong :class="{ positive: store.summary.totalProfitCNY >= 0, negative: store.summary.totalProfitCNY < 0 }">
          {{ formatCurrency(store.summary.totalProfitCNY, 'CNY') }}
        </strong>
      </article>
      <article class="card metric">
        <span>总浮动盈亏 · 美元</span>
        <strong :class="{ positive: store.summary.totalProfitUSD >= 0, negative: store.summary.totalProfitUSD < 0 }">
          {{ formatCurrency(store.summary.totalProfitUSD, 'USD') }}
        </strong>
      </article>
    </div>

    <article class="card metric">
      <span>当前使用汇率</span>
      <strong v-if="usdToCnyRate">1 USD = {{ usdToCnyRate.rate.toFixed(4) }} CNY</strong>
      <strong v-else>暂无 USD/CNY 汇率</strong>
      <p class="muted">
        <span v-if="usdToCnyRate">
          USD/CNY：{{ usdToCnyRate.rate.toFixed(4) }} · {{ usdToCnyRate.rateDate }}
        </span>
        <span v-if="hkdToCnyRate">
          HKD/CNY：{{ hkdToCnyRate.rate.toFixed(4) }} · {{ hkdToCnyRate.rateDate }}
        </span>
      </p>
    </article>

    <div v-if="store.summary?.missingPriceCount" class="notice">
      有 {{ store.summary.missingPriceCount }} 条持仓缺少价格，未计入当前总市值。
    </div>

  </section>
</template>
