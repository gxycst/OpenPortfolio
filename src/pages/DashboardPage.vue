<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { NButton, NDataTable } from 'naive-ui'
import { h } from 'vue'
import { computed, onMounted, ref } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { PositionValuation, SummaryItem } from '@/types/domain'
import { formatCurrency, formatPercent } from '@/utils/format'
import { createTablePagination } from '@/utils/tablePagination'

const store = usePortfolioStore()
onMounted(() => store.refresh())

const usdToCnyRate = computed(() =>
  store.exchangeRates.find((rate) => rate.baseCurrency === 'USD' && rate.quoteCurrency === 'CNY')
)
const hkdToCnyRate = computed(() =>
  store.exchangeRates.find((rate) => rate.baseCurrency === 'HKD' && rate.quoteCurrency === 'CNY')
)
const accountTablePage = ref(1)
const accountTablePageSize = ref(10)
const currencyTablePage = ref(1)
const currencyTablePageSize = ref(10)
const positionTablePage = ref(1)
const positionTablePageSize = ref(10)
const accountTablePagination = computed(() => createTablePagination(accountTablePage, accountTablePageSize))
const currencyTablePagination = computed(() => createTablePagination(currencyTablePage, currencyTablePageSize))
const positionTablePagination = computed(() => createTablePagination(positionTablePage, positionTablePageSize))
const summaryColumns: DataTableColumns<SummaryItem> = [
  {
    title: '名称',
    key: 'name'
  },
  {
    title: '人民币',
    key: 'valueCNY',
    render: (row) => formatCurrency(row.valueCNY, 'CNY')
  },
  {
    title: '占比',
    key: 'percentage',
    render: (row) => formatPercent(row.percentage)
  }
]
const positionColumns: DataTableColumns<PositionValuation> = [
  {
    title: '资产',
    key: 'assetName',
    render: (row) => h('span', [row.assetName, ' ', h('span', { class: 'muted' }, row.assetSymbol)])
  },
  {
    title: '数量',
    key: 'quantity'
  },
  {
    title: '价格',
    key: 'currentPrice',
    render: (row) => row.currentPrice ?? '缺失'
  },
  {
    title: '成本',
    key: 'totalCost',
    render: (row) => (row.averageCost > 0 ? formatCurrency(row.totalCost, row.nativeCurrency) : '未填写')
  },
  {
    title: '市值',
    key: 'marketValue',
    render: (row) => formatCurrency(row.marketValue, row.nativeCurrency)
  },
  {
    title: '盈亏',
    key: 'profitLoss',
    render: (row) =>
      h(
        'span',
        { class: { positive: (row.profitLoss ?? 0) >= 0, negative: (row.profitLoss ?? 0) < 0 } },
        formatCurrency(row.profitLoss, row.nativeCurrency)
      )
  },
  {
    title: '收益率',
    key: 'profitRate',
    render: (row) => formatPercent(row.profitRate)
  }
]
</script>

<template>
  <section class="page">
    <div class="page-actions">
      <NButton size="small" type="primary" @click="store.refresh">刷新</NButton>
    </div>

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
        <NDataTable
          :columns="summaryColumns"
          :data="store.summary?.accountBreakdown ?? []"
          :bordered="false"
          :pagination="accountTablePagination"
        />
      </article>
      <article class="card">
        <h3>币种分布</h3>
        <NDataTable
          :columns="summaryColumns"
          :data="store.summary?.currencyBreakdown ?? []"
          :bordered="false"
          :pagination="currencyTablePagination"
        />
      </article>
    </div>

    <article class="card">
      <h3>持仓摘要</h3>
      <NDataTable
        :columns="positionColumns"
        :data="store.summary?.positions ?? []"
        :bordered="false"
        :pagination="positionTablePagination"
      />
    </article>
  </section>
</template>
