<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { DataTableColumns, DataTableRowKey, FormInst, FormRules } from 'naive-ui'
import { NAlert, NButton, NCard, NDataTable, NEllipsis, NEmpty, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, useMessage } from 'naive-ui'
import { h, nextTick } from 'vue'
import type { AssetCandidate } from '@/providers/manualAssetCatalog'
import { searchAssetCandidatesOnline } from '@/services/assetSearchService'
import { devSeedService } from '@/services/devSeedService'
import { priceService } from '@/services/priceService'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { AssetType, CurrencyCode, MarketCode, PositionValuation } from '@/types/domain'
import { accountMatchesTypes, currencyForAccountType, marketForAccountType, stockAccountTypes } from '@/utils/accountType'
import { formatCurrency, formatPercent, formatUnitPrice } from '@/utils/format'
import { createTablePagination, pageAfterRemoval } from '@/utils/tablePagination'

const store = usePortfolioStore()
const message = useMessage()
const maxStockQuantity = 999_999_999
const marketLabels: Record<MarketCode, string> = {
  CN: 'A 股',
  US: '美股',
  HK: '港股',
  JP: '日股',
  EU: '欧洲',
  FUND_CN: '中国基金',
  CASH: '现金',
  OTHER: '其他'
}
const currencyLabels: Record<CurrencyCode, string> = {
  CNY: '人民币',
  USD: '美元',
  HKD: '港币',
  JPY: '日元',
  EUR: '欧元',
  GBP: '英镑',
  OTHER: '其他币种'
}
const sourceLabels: Record<AssetCandidate['source'], string> = {
  local: '本地',
  built_in: '内置',
  online: '在线'
}
const form = reactive({
  accountId: '',
  assetType: 'stock' as AssetType,
  symbol: '',
  name: '',
  market: 'CN' as MarketCode,
  currency: 'CNY' as CurrencyCode,
  quantity: 0,
  averageCost: undefined as number | undefined,
  currentPrice: undefined as number | undefined,
  holdingProfit: undefined as number | undefined,
  note: ''
})
const formRef = ref<FormInst | null>(null)
const assetSearchFocused = ref(false)
const assetCandidates = ref<AssetCandidate[]>([])
const assetSearchLoading = ref(false)
const suppressAssetSearch = ref(false)
const quoteLoading = ref(false)
const quoteError = ref('')
const latestQuote = ref<{ price: number; priceTime?: string; priceDate: string } | undefined>()
const pendingRemoval = ref<{ id: string; name: string } | undefined>()
const showCreateModal = ref(false)
const showBatchRemoveModal = ref(false)
const editingPositionId = ref<string | undefined>()
const selectedAccountFilter = ref('')
const selectedCurrencyFilter = ref<CurrencyCode | ''>('')
const selectedProfitFilter = ref<'profit' | 'loss' | ''>('')
const keywordFilter = ref('')
const checkedRowKeys = ref<DataTableRowKey[]>([])
const stockTableMaxHeight = 'calc(100vh - 278px)'
const stockTableScrollX = 1520
const tablePage = ref(1)
const tablePageSize = ref(10)
const tablePagination = computed(() => createTablePagination(tablePage, tablePageSize))

const stockAccounts = computed(() => store.accounts.filter((account) => accountMatchesTypes(account, stockAccountTypes)))
const selectedAccount = computed(() => stockAccounts.value.find((account) => account.id === form.accountId))
const accountNameById = computed(() => new Map(store.accounts.map((account) => [account.id, account.name])))
const canCreate = computed(() => stockAccounts.value.length > 0)
const isEditing = computed(() => Boolean(editingPositionId.value))
const showAssetCandidates = computed(() => assetSearchFocused.value && assetCandidates.value.length > 0)
const stockTableEmptyText = computed(() =>
  canCreate.value ? '暂无股票持仓' : '请先创建 A股、美股或港股账户，再录入股票持仓。'
)
const quoteAlert = computed(() => {
  if (assetSearchLoading.value) return { type: 'info' as const, text: '正在联网搜索...' }
  if (quoteLoading.value) return { type: 'info' as const, text: '正在获取最新价...' }
  if (latestQuote.value) {
    return {
      type: 'success' as const,
      text: `最新价：${formatUnitPrice(latestQuote.value.price, form.currency)} · ${
        latestQuote.value.priceTime ?? latestQuote.value.priceDate
      }`
    }
  }
  if (quoteError.value) return { type: 'warning' as const, text: quoteError.value }
  return undefined
})
const stockAccountFilterOptions = computed(() => [
  { label: '全部', value: '' },
  ...stockAccounts.value.map((account) => ({ label: account.name, value: account.id }))
])
const currencyFilterOptions: Array<{ label: string; value: CurrencyCode | '' }> = [
  { label: '全部', value: '' },
  { label: '人民币', value: 'CNY' },
  { label: '美元', value: 'USD' },
  { label: '港币', value: 'HKD' }
]
const profitFilterOptions: Array<{ label: string; value: 'profit' | 'loss' | '' }> = [
  { label: '全部', value: '' },
  { label: '盈利', value: 'profit' },
  { label: '亏损', value: 'loss' }
]
const stockPositions = computed<PositionValuation[]>(() =>
  (store.summary?.positions ?? [])
    .filter((item) => item.assetType === 'stock' || item.assetType === 'etf')
    .filter((item) => (selectedAccountFilter.value ? item.accountId === selectedAccountFilter.value : true))
    .filter((item) => (selectedCurrencyFilter.value ? item.nativeCurrency === selectedCurrencyFilter.value : true))
    .filter((item) => {
      if (!selectedProfitFilter.value) return true
      const profitLoss = item.profitLoss ?? 0
      return selectedProfitFilter.value === 'profit' ? profitLoss >= 0 : profitLoss < 0
    })
    .filter((item) => {
      const keyword = keywordFilter.value.trim().toUpperCase()
      if (!keyword) return true
      const accountName = accountNameById.value.get(item.accountId) ?? ''
      return (
        item.assetName.toUpperCase().includes(keyword) ||
        item.assetSymbol.toUpperCase().includes(keyword) ||
        accountName.toUpperCase().includes(keyword)
      )
    })
)
const selectedBatchPositions = computed(() =>
  stockPositions.value.filter((position) => checkedRowKeys.value.includes(position.positionId))
)
const stockColumns: DataTableColumns<PositionValuation> = [
  {
    type: 'selection',
    fixed: 'left',
    width: 48
  },
  {
    title: '资产',
    key: 'assetName',
    fixed: 'left',
    width: 220,
    className: 'nowrap-cell',
    render: (row) => renderEllipsis(`${row.assetName} ${row.assetSymbol}`, 'asset-cell')
  },
  {
    title: '账户',
    key: 'accountId',
    width: 150,
    className: 'nowrap-cell',
    render: (row) => renderEllipsis(accountNameById.value.get(row.accountId) ?? '未知账户')
  },
  {
    title: '市值',
    key: 'marketValue',
    width: 150,
    className: 'nowrap-cell amount-cell',
    defaultSortOrder: 'descend',
    sorter: (a, b) => sortableValue(a.marketValue) - sortableValue(b.marketValue),
    render: (row) =>
      renderEllipsis(row.marketValue !== undefined ? formatCurrency(row.marketValue, row.nativeCurrency) : '缺少价格', 'amount-cell')
  },
  {
    title: '总成本',
    key: 'totalCost',
    width: 150,
    className: 'nowrap-cell amount-cell',
    sorter: (a, b) => sortableValue(a.totalCost) - sortableValue(b.totalCost),
    render: (row) => renderEllipsis(row.averageCost > 0 ? formatCurrency(row.totalCost, row.nativeCurrency) : '未填写', 'amount-cell')
  },
  {
    title: '盈亏',
    key: 'profitLoss',
    width: 150,
    className: 'nowrap-cell amount-cell',
    sorter: (a, b) => sortableValue(a.profitLoss) - sortableValue(b.profitLoss),
    render: (row) => renderEllipsis(formatCurrency(row.profitLoss, row.nativeCurrency), [
      'amount-cell',
      { positive: (row.profitLoss ?? 0) >= 0, negative: (row.profitLoss ?? 0) < 0 }
    ])
  },
  {
    title: '盈亏率',
    key: 'profitRate',
    width: 120,
    className: 'nowrap-cell amount-cell',
    sorter: (a, b) => sortableValue(a.profitRate) - sortableValue(b.profitRate),
    render: (row) => renderEllipsis(formatPercent(row.profitRate), [
      'amount-cell',
      { positive: (row.profitLoss ?? 0) >= 0, negative: (row.profitLoss ?? 0) < 0 }
    ])
  },
  {
    title: '币种',
    key: 'nativeCurrency',
    width: 90,
    className: 'nowrap-cell',
    render: (row) => currencyLabels[row.nativeCurrency]
  },
  {
    title: '数量',
    key: 'quantity',
    width: 120,
    className: 'nowrap-cell amount-cell',
    render: (row) => renderEllipsis(String(row.quantity), 'amount-cell')
  },
  {
    title: '成本价',
    key: 'averageCost',
    width: 130,
    className: 'nowrap-cell amount-cell',
    render: (row) => renderEllipsis(row.averageCost > 0 ? formatUnitPrice(row.averageCost, row.nativeCurrency) : '未填写', 'amount-cell')
  },
  {
    title: '当前价',
    key: 'currentPrice',
    width: 130,
    className: 'nowrap-cell amount-cell',
    render: (row) =>
      renderEllipsis(row.currentPrice !== undefined ? formatUnitPrice(row.currentPrice, row.nativeCurrency) : '缺少价格', 'amount-cell')
  },
  {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 140,
    className: 'nowrap-cell',
    render: (row) =>
      h(
        'div',
        { class: 'stock-action-group' },
        [
          h(
            NButton,
            {
              size: 'small',
              secondary: true,
              onClick: () => openEditModal(row)
            },
            { default: () => '编辑' }
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              secondary: true,
              onClick: () => requestRemovePosition(row.positionId, row.assetName)
            },
            { default: () => '删除' }
          )
        ]
      )
  }
]
const rules: FormRules = {
  accountId: {
    required: true,
    message: '请选择账户',
    trigger: ['change']
  },
  symbol: {
    required: true,
    message: '请输入资产代码',
    trigger: ['input', 'blur']
  },
  quantity: {
    required: true,
    type: 'number',
    validator: (_rule, value: number) => Number.isFinite(value) && value > 0 && value <= maxStockQuantity,
    message: `请输入 0 到 ${maxStockQuantity.toLocaleString('zh-CN')} 之间的持仓数量`,
    trigger: ['input', 'blur']
  }
}
let searchTimer: ReturnType<typeof setTimeout> | undefined

onMounted(async () => {
  if (isLocalDevelopmentHost()) {
    if (shouldClearStockTestFromHash()) {
      await devSeedService.clearStockScrollTest()
    } else if (stockSeedCountFromHash() > 0) {
      await devSeedService.seedStockScrollTest(stockSeedCountFromHash())
    }
  }
  await store.refresh()
  form.accountId = stockAccounts.value[0]?.id ?? ''
  syncAccountDerivedFields()
})

watch(
  () => form.accountId,
  () => {
    syncAccountDerivedFields()
    if (!isEditing.value) clearStockInputFields()
  }
)

watch([selectedAccountFilter, selectedCurrencyFilter, selectedProfitFilter, keywordFilter], () => {
  tablePage.value = 1
  checkedRowKeys.value = []
})

watch(
  () => form.symbol,
  (query) => {
    if (suppressAssetSearch.value) return
    if (!query.trim()) {
      if (searchTimer) clearTimeout(searchTimer)
      assetCandidates.value = []
      assetSearchLoading.value = false
      assetSearchFocused.value = false
      clearLatestQuote()
      return
    }
    assetSearchFocused.value = true
    clearLatestQuote()
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(async () => {
      assetSearchLoading.value = true
      assetCandidates.value = (await searchAssetCandidatesOnline(query, store.assets)).filter(
        (candidate) => candidate.assetType === 'stock' || candidate.assetType === 'etf'
      )
      assetSearchLoading.value = false
    }, 250)
  }
)

async function submit() {
  try {
    await formRef.value?.validate()
    await ensureLatestQuote()
    await store.savePosition({
      ...form,
      name: form.name.trim() || form.symbol.trim().toUpperCase(),
      currentPrice: normalizeOptionalNumber(form.currentPrice),
      quantity: Number(form.quantity),
      averageCost: normalizeOptionalNumber(form.averageCost)
    }, editingPositionId.value)
    resetCreateForm()
    showCreateModal.value = false
  } catch {
    // The store owns the user-facing error message.
  }
}

function resetCreateForm() {
  editingPositionId.value = undefined
  form.accountId = stockAccounts.value[0]?.id ?? ''
  form.assetType = 'stock'
  form.market = 'CN'
  form.currency = 'CNY'
  syncAccountDerivedFields()
  clearStockInputFields()
  formRef.value?.restoreValidation()
}

async function openEditModal(row: PositionValuation) {
  suppressAssetSearch.value = true
  editingPositionId.value = row.positionId
  const account = store.accounts.find((item) => item.id === row.accountId)
  form.accountId = row.accountId
  form.assetType = row.assetType
  form.symbol = row.assetSymbol
  form.name = row.assetName
  form.market = account ? marketForAccountType(account.type) : 'CN'
  form.currency = row.nativeCurrency
  form.quantity = row.quantity
  form.averageCost = row.averageCost > 0 ? row.averageCost : undefined
  form.currentPrice = row.currentPrice
  form.holdingProfit = undefined
  form.note = ''
  assetCandidates.value = []
  assetSearchFocused.value = false
  assetSearchLoading.value = false
  quoteError.value = ''
  latestQuote.value =
    row.currentPrice !== undefined
      ? {
          price: row.currentPrice,
          priceDate: new Date().toISOString().slice(0, 10)
        }
      : undefined
  showCreateModal.value = true
  await nextTick()
  suppressAssetSearch.value = false
  formRef.value?.restoreValidation()
}

async function openCreateModal() {
  resetCreateForm()
  showCreateModal.value = true
  await nextTick()
  formRef.value?.restoreValidation()
}

function clearStockInputFields() {
  if (searchTimer) clearTimeout(searchTimer)
  form.symbol = ''
  form.name = ''
  form.quantity = 0
  form.averageCost = undefined
  form.currentPrice = undefined
  form.holdingProfit = undefined
  form.note = ''
  assetCandidates.value = []
  assetSearchFocused.value = false
  assetSearchLoading.value = false
  clearLatestQuote()
}

function resetFilters() {
  selectedAccountFilter.value = ''
  selectedCurrencyFilter.value = ''
  selectedProfitFilter.value = ''
  keywordFilter.value = ''
}

function rowKey(row: PositionValuation): string {
  return row.positionId
}

function requestBatchRemove() {
  if (checkedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的表格行')
    return
  }
  showBatchRemoveModal.value = true
}

async function confirmBatchRemove() {
  const ids = selectedBatchPositions.value.map((position) => position.positionId)
  const remainingCount = stockPositions.value.length - ids.length
  await store.removePositions(ids)
  checkedRowKeys.value = []
  tablePage.value = pageAfterRemoval(tablePage.value, tablePageSize.value, remainingCount)
  showBatchRemoveModal.value = false
}

function sortableValue(value: number | undefined): number {
  return value === undefined ? Number.NEGATIVE_INFINITY : value
}

function renderEllipsis(text: string, className?: string | Array<string | Record<string, boolean>>) {
  return h(
    NEllipsis,
    {
      class: ['table-ellipsis', className],
      tooltip: true
    },
    { default: () => text }
  )
}

function stockSeedCountFromHash(): number {
  const query = window.location.hash.split('?')[1] ?? ''
  const count = Number(new URLSearchParams(query).get('seedStockTest'))
  return Number.isFinite(count) && count > 0 ? Math.min(count, 200) : 0
}

function shouldClearStockTestFromHash(): boolean {
  const query = window.location.hash.split('?')[1] ?? ''
  return new URLSearchParams(query).get('clearStockTest') === '1'
}

function isLocalDevelopmentHost(): boolean {
  return window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
}

function selectAsset(candidate: AssetCandidate) {
  if (candidate.market !== form.market) {
    const messageText = `当前选择的是${marketLabels[form.market]}账户，只能选择${marketLabels[form.market]}资产`
    quoteError.value = messageText
    message.warning(messageText)
    return
  }
  form.symbol = candidate.symbol
  form.name = candidate.name
  form.assetType = candidate.assetType
  syncAccountDerivedFields()
  assetSearchFocused.value = false
  void refreshLatestQuote()
}

function syncAccountDerivedFields() {
  if (!selectedAccount.value) return
  form.market = marketForAccountType(selectedAccount.value.type)
  form.currency = currencyForAccountType(selectedAccount.value.type)
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

async function ensureLatestQuote(): Promise<void> {
  validateSymbolMarket()
  if (normalizeOptionalNumber(form.currentPrice) !== undefined) return
  await refreshLatestQuote()
  if (normalizeOptionalNumber(form.currentPrice) === undefined) {
    throw new Error('未获取到最新价格')
  }
}

async function refreshLatestQuote(): Promise<void> {
  const symbol = form.symbol.trim()
  if (!symbol || !selectedAccount.value) return

  quoteLoading.value = true
  quoteError.value = ''
  const requestKey = `${symbol}:${form.market}`
  try {
    validateSymbolMarket()
    const quote = await priceService.fetchStockQuoteForInput(symbol, form.market)
    if (requestKey !== `${form.symbol.trim()}:${form.market}`) return
    form.currentPrice = quote.price
    form.name = form.name.trim() || quote.name
    latestQuote.value = {
      price: quote.price,
      priceDate: quote.priceDate,
      priceTime: quote.priceTime
    }
  } catch (error) {
    form.currentPrice = undefined
    latestQuote.value = undefined
    quoteError.value = error instanceof Error ? error.message : '暂时没有获取到最新价格'
  } finally {
    quoteLoading.value = false
  }
}

function validateSymbolMarket(): void {
  const messageText = marketMismatchMessage(form.symbol, form.market)
  if (!messageText) return
  quoteError.value = messageText
  message.warning(messageText)
  throw new Error(messageText)
}

function marketMismatchMessage(symbol: string, market: MarketCode): string | undefined {
  const normalized = symbol.trim().toUpperCase()
  if (!normalized) return undefined
  if (market === 'US' && /^(\d{5,6}|SH\d{6}|SZ\d{6}|\d{5}\.HK|HK\d{5})$/.test(normalized)) {
    return '当前选择的是美股账户，只能输入美股代码，例如 AAPL、QQQ、BRK.B'
  }
  if (market === 'CN' && (/^[A-Z]+([.-][A-Z]+)?$/.test(normalized) || /^(\d{5}\.HK|HK\d{5})$/.test(normalized))) {
    return '当前选择的是 A 股账户，只能输入 A 股代码，例如 600519、000001'
  }
  if (market === 'HK' && !/^(HK)?\d{4,5}$/i.test(normalized)) {
    return '当前选择的是港股账户，只能输入港股代码，例如 00700、07709'
  }
  const exactCandidate = assetCandidates.value.find((candidate) => candidate.symbol.toUpperCase() === normalized)
  if (exactCandidate && exactCandidate.market !== market) {
    return `当前选择的是${marketLabels[market]}账户，只能输入${marketLabels[market]}代码`
  }
  return undefined
}

function clearLatestQuote() {
  form.currentPrice = undefined
  latestQuote.value = undefined
  quoteError.value = ''
}

function requestRemovePosition(positionId: string, assetName: string) {
  pendingRemoval.value = { id: positionId, name: assetName }
}

async function confirmRemovePosition() {
  if (!pendingRemoval.value) return
  const remainingCount = stockPositions.value.some((position) => position.positionId === pendingRemoval.value?.id)
    ? stockPositions.value.length - 1
    : stockPositions.value.length
  await store.removePosition(pendingRemoval.value.id)
  tablePage.value = pageAfterRemoval(tablePage.value, tablePageSize.value, remainingCount)
  checkedRowKeys.value = checkedRowKeys.value.filter((key) => key !== pendingRemoval.value?.id)
  pendingRemoval.value = undefined
}
</script>

<template>
  <section class="page">
    <NCard :bordered="false" class="query-card">
      <div class="account-filter-row">
        <label class="query-field">
          <span>账户</span>
          <NSelect
            v-model:value="selectedAccountFilter"
            class="account-filter-select"
            size="small"
            :options="stockAccountFilterOptions"
          />
        </label>
        <label class="query-field">
          <span>币种</span>
          <NSelect
            v-model:value="selectedCurrencyFilter"
            class="account-filter-select"
            size="small"
            :options="currencyFilterOptions"
          />
        </label>
        <label class="query-field">
          <span>盈亏情况</span>
          <NSelect
            v-model:value="selectedProfitFilter"
            class="account-filter-select"
            size="small"
            :options="profitFilterOptions"
          />
        </label>
        <label class="query-field">
          <span>关键词</span>
          <NInput v-model:value="keywordFilter" class="asset-filter-input" size="small" placeholder="搜索代码/名称" clearable />
        </label>
        <NButton size="small" type="primary" @click="resetFilters">重置</NButton>
        <NButton size="small" type="error" secondary @click="requestBatchRemove">批量删除</NButton>
        <NButton class="account-create-button" size="small" type="primary" :disabled="!canCreate" @click="openCreateModal">新增持仓</NButton>
      </div>
    </NCard>

    <NCard :bordered="false" class="table-card">
      <NDataTable
        :columns="stockColumns"
        :data="stockPositions"
        bordered
        flex-height
        :max-height="stockTableMaxHeight"
        :scroll-x="stockTableScrollX"
        :pagination="tablePagination"
        :row-key="rowKey"
        v-model:checked-row-keys="checkedRowKeys"
      >
        <template #empty>
          <div class="table-empty-state">
            <NEmpty size="small" :description="stockTableEmptyText" />
          </div>
        </template>
      </NDataTable>
    </NCard>

    <NModal v-model:show="showCreateModal" preset="card" :title="isEditing ? '编辑持仓' : '新增持仓'" class="position-create-modal">
      <NForm
        ref="formRef"
        class="account-form create-form"
        label-placement="left"
        label-align="right"
        :label-width="88"
        :model="form"
        :rules="rules"
        @submit.prevent="submit"
      >
        <NFormItem label="账户" path="accountId" class="account-name-field">
          <NSelect
            v-model:value="form.accountId"
            size="small"
            :disabled="isEditing"
            :options="stockAccounts.map((account) => ({ label: account.name, value: account.id }))"
          />
        </NFormItem>
        <NFormItem label="资产代码" path="symbol" class="account-name-field">
          <div class="asset-search-field modal-field">
            <NInput
              v-model:value="form.symbol"
              size="small"
              autocomplete="off"
              placeholder="输入代码，例如 QQQ、600519"
              @focus="assetSearchFocused = true"
              @input="assetSearchFocused = true"
              @blur="refreshLatestQuote"
              @keydown.escape="assetSearchFocused = false"
            />
          <NAlert v-if="quoteAlert" class="field-alert" :show-icon="false" :type="quoteAlert.type">
            {{ quoteAlert.text }}
          </NAlert>
          <div v-if="showAssetCandidates" class="asset-suggestions">
            <NButton
              v-for="candidate in assetCandidates"
              :key="`${candidate.market}:${candidate.symbol}:${candidate.currency}`"
              class="asset-suggestion"
              text
              @mousedown.prevent="selectAsset(candidate)"
            >
              <span v-if="candidate.assetType === 'fund'">
                <strong>{{ candidate.name }}</strong>
                {{ candidate.symbol }}
              </span>
              <span v-else>
                <strong>{{ candidate.symbol }}</strong>
                {{ candidate.name }}
              </span>
              <small>
                {{ marketLabels[candidate.market] }} · {{ currencyLabels[candidate.currency] }} ·
                {{ sourceLabels[candidate.source] }}
              </small>
            </NButton>
          </div>
          </div>
        </NFormItem>
        <NFormItem label="持仓数量" path="quantity" class="account-name-field">
          <NInputNumber v-model:value="form.quantity" size="small" :min="0" :max="maxStockQuantity" :step="0.000001" />
        </NFormItem>
        <NFormItem label="成本价" class="account-name-field">
          <NInputNumber v-model:value="form.averageCost" size="small" :min="0" :step="0.000001" placeholder="可选" />
        </NFormItem>
      <div class="form-footer">
        <span v-if="store.error" class="negative">{{ store.error }}</span>
        <NButton size="small" @click="showCreateModal = false">取消</NButton>
        <NButton size="small" type="primary" :disabled="!canCreate || quoteLoading" @click="submit">{{ isEditing ? '确认保存' : '确认新增' }}</NButton>
      </div>
      </NForm>
    </NModal>

    <div v-if="pendingRemoval" class="modal-backdrop" @click.self="pendingRemoval = undefined">
      <section class="modal">
        <h3>删除持仓</h3>
        <p>确定要删除「{{ pendingRemoval.name }}」吗？这个操作会从当前持仓列表中移除它。</p>
        <div class="form-actions modal-actions">
          <NButton size="small" @click="pendingRemoval = undefined">取消</NButton>
          <NButton size="small" type="error" @click="confirmRemovePosition">确认删除</NButton>
        </div>
      </section>
    </div>

    <NModal v-model:show="showBatchRemoveModal" preset="card" title="批量删除持仓" class="account-create-modal">
      <p class="modal-copy">确定要删除已选择的 {{ selectedBatchPositions.length }} 条持仓吗？</p>
      <div class="form-actions modal-actions">
        <NButton size="small" @click="showBatchRemoveModal = false">取消</NButton>
        <NButton size="small" type="error" @click="confirmBatchRemove">确认删除</NButton>
      </div>
    </NModal>
  </section>
</template>
