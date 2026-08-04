<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { formatCurrency, formatPercent } from '@/utils/format'

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
    <header class="page-header">
      <div>
        <h2>首页</h2>
        <p>按当前价格和公开 USD/CNY 汇率汇总资产总额。</p>
      </div>
      <button @click="store.refresh">刷新</button>
    </header>

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

    <div class="grid two">
      <article class="card">
        <h3>账户分布</h3>
        <table>
          <tbody>
            <tr v-for="item in store.summary?.accountBreakdown" :key="item.key">
              <td>{{ item.name }}</td>
              <td>{{ formatCurrency(item.valueCNY, 'CNY') }}</td>
              <td>{{ formatPercent(item.percentage) }}</td>
            </tr>
          </tbody>
        </table>
      </article>
      <article class="card">
        <h3>币种分布</h3>
        <table>
          <tbody>
            <tr v-for="item in store.summary?.currencyBreakdown" :key="item.key">
              <td>{{ item.name }}</td>
              <td>{{ formatCurrency(item.valueCNY, 'CNY') }}</td>
              <td>{{ formatPercent(item.percentage) }}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>

    <article class="card">
      <h3>持仓摘要</h3>
      <table>
        <thead>
          <tr>
            <th>资产</th>
            <th>数量</th>
            <th>价格</th>
            <th>成本</th>
            <th>市值</th>
            <th>盈亏</th>
            <th>收益率</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in store.summary?.positions" :key="position.positionId">
            <td>{{ position.assetName }} <span class="muted">{{ position.assetSymbol }}</span></td>
            <td>{{ position.quantity }}</td>
            <td>{{ position.currentPrice ?? '缺失' }}</td>
            <td>{{ position.averageCost > 0 ? formatCurrency(position.totalCost, position.nativeCurrency) : '未填写' }}</td>
            <td>{{ formatCurrency(position.marketValue, position.nativeCurrency) }}</td>
            <td :class="{ positive: (position.profitLoss ?? 0) >= 0, negative: (position.profitLoss ?? 0) < 0 }">
              {{ formatCurrency(position.profitLoss, position.nativeCurrency) }}
            </td>
            <td>{{ formatPercent(position.profitRate) }}</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>
