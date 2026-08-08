<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import type { DataTableColumns, DataTableRowKey, FormInst, FormRules } from 'naive-ui'
import { NAlert, NButton, NCard, NDataTable, NEmpty, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, useMessage } from 'naive-ui'
import { h, nextTick } from 'vue'
import { fetchLatestFundNav, type FundNavQuote } from '@/providers/funds/eastmoneyFundNavProvider'
import type { AssetCandidate } from '@/providers/manualAssetCatalog'
import { searchAssetCandidatesOnline } from '@/services/assetSearchService'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { CurrencyCode, PositionValuation } from '@/types/domain'
import { accountMatchesTypes, currencyForAccountType, fundAccountTypes } from '@/utils/accountType'
import { formatCurrency, formatNav, formatPercent } from '@/utils/format'
import { createTablePagination, pageAfterRemoval } from '@/utils/tablePagination'
import { useIsMobile } from '@/composables/useIsMobile'
import { Filter } from 'lucide-vue-next'

const store = usePortfolioStore()
const message = useMessage()
const FUND_VISIBLE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000
const currencyLabels: Record<CurrencyCode, string> = {
  CNY: '人民币',
  USD: '美元',
  HKD: '港币',
  JPY: '日元',
  EUR: '欧元',
  GBP: '英镑',
  OTHER: '其他币种'
}

const form = reactive({
  accountId: '',
  symbol: '',
  name: '',
  currency: 'CNY' as CurrencyCode,
  quantity: 0,
  holdingProfit: undefined as number | undefined,
  currentPrice: undefined as number | undefined,
  priceDate: '',
  priceProviderId: ''
})
const formRef = ref<FormInst | null>(null)
const fundSearchFocused = ref(false)
const fundCandidates = ref<AssetCandidate[]>([])
const fundSearchLoading = ref(false)
const suppressFundSearch = ref(false)
const navLoading = ref(false)
const navError = ref('')
const pendingRemoval = ref<{ id: string; name: string } | undefined>()
const showCreateModal = ref(false)
const showBatchRemoveModal = ref(false)
const showMobileFilters = ref(false)
const editingPositionId = ref<string | undefined>()
const selectedFundCode = ref('')
const selectedAccountFilter = ref('')
const keywordFilter = ref('')
const checkedRowKeys = ref<DataTableRowKey[]>([])
const fundTableMaxHeight = 'var(--table-max-height)'
const isMobile = useIsMobile()
const fundTableScrollX = computed(() => (isMobile.value ? 720 : undefined))
const tablePage = ref(1)
const tablePageSize = ref(10)
const tablePagination = computed(() => createTablePagination(tablePage, tablePageSize))

const fundAccounts = computed(() => store.accounts.filter((account) => accountMatchesTypes(account, fundAccountTypes)))
const selectedAccount = computed(() => fundAccounts.value.find((account) => account.id === form.accountId))
const accountNameById = computed(() => new Map(store.accounts.map((account) => [account.id, account.name])))
const isEditing = computed(() => Boolean(editingPositionId.value))
const fundAccountFilterOptions = computed(() => [
  { label: '全部', value: '' },
  ...fundAccounts.value.map((account) => ({ label: account.name, value: account.id }))
])
const fundPositions = computed(() =>
  (store.summary?.positions ?? [])
    .filter((item) => item.assetType === 'fund')
    .filter((item) => (selectedAccountFilter.value ? item.accountId === selectedAccountFilter.value : true))
    .filter((item) => {
      const keyword = keywordFilter.value.trim().toUpperCase()
      if (!keyword) return true
      return item.assetName.toUpperCase().includes(keyword) || item.assetSymbol.toUpperCase().includes(keyword)
    })
)
const selectedBatchPositions = computed(() =>
  fundPositions.value.filter((position) => checkedRowKeys.value.includes(position.positionId))
)
const visibleFundPositions = computed(() =>
  fundPositions.value.slice((tablePage.value - 1) * tablePageSize.value, tablePage.value * tablePageSize.value)
)
const fundColumns = computed<DataTableColumns<PositionValuation>>(() => isMobile.value ? mobileFundColumns : desktopFundColumns)
const desktopFundColumns: DataTableColumns<PositionValuation> = [
  {
    type: 'selection'
  },
  {
    title: '基金',
    key: 'assetName',
    render: (row) => h('span', [row.assetName, ' ', h('span', { class: 'muted' }, row.assetSymbol)])
  },
  {
    title: '账户',
    key: 'accountId',
    width: 150,
    className: 'nowrap-cell',
    render: (row) => accountNameById.value.get(row.accountId) ?? '未知账户'
  },
  {
    title: '币种',
    key: 'nativeCurrency',
    width: 90,
    className: 'nowrap-cell',
    render: (row) => currencyLabels[row.nativeCurrency]
  },
  {
    title: '份额',
    key: 'quantity'
  },
  {
    title: '最新净值',
    key: 'currentPrice',
    render: (row) => formatNav(row.currentPrice)
  },
  {
    title: '净值日期',
    key: 'priceDate',
    render: (row) => row.priceDate ?? '缺失'
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
    title: '盈亏率',
    key: 'profitRate',
    render: (row) =>
      h(
        'span',
        { class: { positive: (row.profitLoss ?? 0) >= 0, negative: (row.profitLoss ?? 0) < 0 } },
        formatPercent(row.profitRate)
      )
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) =>
      h('div', { class: 'stock-action-group' }, [
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
      ])
  }
]
const mobileFundColumns: DataTableColumns<PositionValuation> = [
  {
    type: 'selection',
    width: 42
  },
  {
    title: '基金',
    key: 'assetName',
    width: 240,
    render: (row) =>
      h('div', { class: 'mobile-main-cell' }, [
        h('strong', row.assetName),
        h('span', `${row.assetSymbol} · ${accountNameById.value.get(row.accountId) ?? '未知账户'} · ${currencyLabels[row.nativeCurrency]}`),
        h('span', `净值 ${formatNav(row.currentPrice)} · ${row.priceDate ?? '缺失'}`)
      ])
  },
  {
    title: '市值',
    key: 'marketValue',
    width: 145,
    className: 'nowrap-cell amount-cell',
    render: (row) => formatCurrency(row.marketValue, row.nativeCurrency)
  },
  {
    title: '盈亏',
    key: 'profitLoss',
    width: 130,
    className: 'nowrap-cell amount-cell',
    render: (row) =>
      h('div', { class: ['mobile-profit-cell', { positive: (row.profitLoss ?? 0) >= 0, negative: (row.profitLoss ?? 0) < 0 }] }, [
        h('strong', formatCurrency(row.profitLoss, row.nativeCurrency)),
        h('span', formatPercent(row.profitRate))
      ])
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => renderActionButtons(row)
  }
]
const canCreate = computed(() => fundAccounts.value.length > 0)
const showFundCandidates = computed(() => fundSearchFocused.value && fundCandidates.value.length > 0)
const fundTableEmptyText = computed(() =>
  canCreate.value ? '暂无基金持仓' : '请先创建人民币基金、美元基金或港元基金账户，再录入基金。'
)
const rules: FormRules = {
  accountId: {
    required: true,
    message: '请选择账户',
    trigger: ['change']
  },
  symbol: {
    required: true,
    message: '请输入基金名称或代码搜索',
    trigger: ['input', 'blur']
  },
  quantity: {
    required: true,
    type: 'number',
    validator: (_rule, value: number) => Number.isFinite(value) && value > 0,
    message: '请输入大于 0 的持有份额',
    trigger: ['input', 'blur']
  },
  holdingProfit: {
    type: 'number',
    validator: (_rule, value: number | null | undefined) => {
      if (value === undefined || value === null) return true
      if (!Number.isFinite(value)) return false
      const quantity = normalizeOptionalNumber(form.quantity)
      const currentPrice = normalizeOptionalNumber(form.currentPrice)
      if (quantity === undefined || currentPrice === undefined) return true
      return quantity * currentPrice - value > 0
    },
    message: '持有收益不能大于或等于当前市值',
    trigger: ['input', 'blur']
  }
}
let searchTimer: ReturnType<typeof setTimeout> | undefined
let navTimer: ReturnType<typeof setTimeout> | undefined
let fundVisibleRefreshTimer: ReturnType<typeof setInterval> | undefined
let lastVisibleFundRefreshAt = 0

onMounted(async () => {
  await store.refresh()
  form.accountId = fundAccounts.value[0]?.id ?? ''
  syncAccountCurrency()
  await refreshVisibleFundPricesIfDue(true)
  fundVisibleRefreshTimer = setInterval(() => {
    void refreshVisibleFundPricesIfDue()
  }, FUND_VISIBLE_REFRESH_INTERVAL_MS)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (navTimer) clearTimeout(navTimer)
  if (fundVisibleRefreshTimer) clearInterval(fundVisibleRefreshTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

watch(
  () => form.accountId,
  () => syncAccountCurrency()
)

watch([selectedAccountFilter, keywordFilter], () => {
  tablePage.value = 1
  checkedRowKeys.value = []
})

watch(
  () => form.symbol,
  (query) => {
    if (suppressFundSearch.value) return
    if (!query.trim()) {
      if (searchTimer) clearTimeout(searchTimer)
      if (navTimer) clearTimeout(navTimer)
      fundCandidates.value = []
      fundSearchLoading.value = false
      fundSearchFocused.value = false
      selectedFundCode.value = ''
      form.currentPrice = undefined
      form.priceDate = ''
      form.priceProviderId = ''
      navError.value = ''
      return
    }
    fundSearchFocused.value = true
    selectedFundCode.value = /^\d{6}$/.test(query.trim()) ? query.trim() : ''
    form.name = selectedFundCode.value ? form.name : ''
    form.currentPrice = undefined
    form.priceDate = ''
    form.priceProviderId = ''
    navError.value = ''
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(async () => {
      fundSearchLoading.value = true
      fundCandidates.value = (await searchAssetCandidatesOnline(query, store.assets)).filter(
        (candidate) => candidate.assetType === 'fund'
      )
      fundSearchLoading.value = false
    }, 250)
    if (navTimer) clearTimeout(navTimer)
    if (selectedFundCode.value) {
      navTimer = setTimeout(() => {
        void refreshNav()
      }, 600)
    }
  }
)

async function selectFund(candidate: AssetCandidate) {
  form.symbol = candidate.symbol
  form.name = candidate.name
  selectedFundCode.value = candidate.symbol
  syncAccountCurrency()
  fundSearchFocused.value = false
  await refreshNav()
}

function syncAccountCurrency() {
  if (!selectedAccount.value) return
  form.currency = currencyForAccountType(selectedAccount.value.type)
}

async function refreshNav() {
  const fundCode = selectedFundCode.value || (/^\d{6}$/.test(form.symbol.trim()) ? form.symbol.trim() : '')
  if (!fundCode) {
    navError.value = '请先选择基金，或输入 6 位基金代码'
    return
  }
  navLoading.value = true
  navError.value = ''
  try {
    const quote = await fetchLatestFundNav(fundCode)
    applyNavQuote(quote)
  } catch (error) {
    navError.value = error instanceof Error ? error.message : '净值获取失败'
  } finally {
    navLoading.value = false
  }
}

async function ensureLatestNav(): Promise<void> {
  if (normalizeOptionalNumber(form.currentPrice) !== undefined && form.priceDate) return
  await refreshNav()
  if (normalizeOptionalNumber(form.currentPrice) === undefined || !form.priceDate) {
    throw new Error(navError.value || '基金净值获取失败')
  }
}

function applyNavQuote(quote: FundNavQuote) {
  form.symbol = quote.fundCode
  form.name = form.name || quote.name
  selectedFundCode.value = quote.fundCode
  form.currentPrice = quote.nav
  form.priceDate = quote.navDate
  form.priceProviderId = quote.providerId
}

async function submit() {
  try {
    await formRef.value?.validate()
    await ensureLatestNav()
    await store.savePosition({
      accountId: form.accountId,
      assetType: 'fund',
      symbol: form.symbol,
      name: form.name.trim() || form.symbol.trim(),
      market: 'FUND_CN',
      currency: form.currency,
      quantity: Number(form.quantity),
      holdingProfit: normalizeOptionalNumber(form.holdingProfit),
      currentPrice: normalizeOptionalNumber(form.currentPrice),
      priceDate: form.priceDate || undefined,
      priceProviderId: form.priceProviderId || undefined
    }, editingPositionId.value)
    resetCreateForm()
    showCreateModal.value = false
  } catch {
    // The store owns the user-facing error message.
  }
}

function resetCreateForm() {
  editingPositionId.value = undefined
  form.accountId = fundAccounts.value[0]?.id ?? ''
  syncAccountCurrency()
  if (searchTimer) clearTimeout(searchTimer)
  if (navTimer) clearTimeout(navTimer)
  form.symbol = ''
  form.name = ''
  selectedFundCode.value = ''
  form.quantity = 0
  form.holdingProfit = undefined
  form.currentPrice = undefined
  form.priceDate = ''
  form.priceProviderId = ''
  fundCandidates.value = []
  fundSearchFocused.value = false
  fundSearchLoading.value = false
  navLoading.value = false
  navError.value = ''
  formRef.value?.restoreValidation()
}

async function openEditModal(row: PositionValuation) {
  suppressFundSearch.value = true
  editingPositionId.value = row.positionId
  const position = store.positions.find((item) => item.id === row.positionId)
  form.accountId = row.accountId
  form.symbol = row.assetSymbol
  form.name = row.assetName
  form.currency = row.nativeCurrency
  form.quantity = row.quantity
  form.holdingProfit = position?.holdingProfit ?? row.profitLoss
  form.currentPrice = row.currentPrice
  form.priceDate = row.priceDate ?? ''
  form.priceProviderId = ''
  selectedFundCode.value = row.assetSymbol
  fundCandidates.value = []
  fundSearchFocused.value = false
  fundSearchLoading.value = false
  navLoading.value = false
  navError.value = ''
  showCreateModal.value = true
  await nextTick()
  suppressFundSearch.value = false
  formRef.value?.restoreValidation()
}

async function openCreateModal() {
  resetCreateForm()
  showCreateModal.value = true
  await nextTick()
  formRef.value?.restoreValidation()
}

function resetFilters() {
  selectedAccountFilter.value = ''
  keywordFilter.value = ''
  showMobileFilters.value = false
}

function rowKey(row: PositionValuation): string {
  return row.positionId
}

function renderActionButtons(row: PositionValuation) {
  return h('div', { class: 'stock-action-group' }, [
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
  ])
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
  const remainingCount = fundPositions.value.length - ids.length
  await store.removePositions(ids)
  checkedRowKeys.value = []
  tablePage.value = pageAfterRemoval(tablePage.value, tablePageSize.value, remainingCount)
  showBatchRemoveModal.value = false
}

async function refreshVisibleFundPricesIfDue(force = false) {
  const now = Date.now()
  if (!force && now - lastVisibleFundRefreshAt < FUND_VISIBLE_REFRESH_INTERVAL_MS) return
  const assetIds = [...new Set(visibleFundPositions.value.map((position) => position.assetId))]
  if (assetIds.length === 0) return
  lastVisibleFundRefreshAt = now
  await store.refreshFundPricesByAssetIds(assetIds)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    void refreshVisibleFundPricesIfDue()
  }
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function requestRemovePosition(positionId: string, assetName: string) {
  pendingRemoval.value = { id: positionId, name: assetName }
}

async function confirmRemovePosition() {
  if (!pendingRemoval.value) return
  const remainingCount = fundPositions.value.some((position) => position.positionId === pendingRemoval.value?.id)
    ? fundPositions.value.length - 1
    : fundPositions.value.length
  await store.removePosition(pendingRemoval.value.id)
  tablePage.value = pageAfterRemoval(tablePage.value, tablePageSize.value, remainingCount)
  checkedRowKeys.value = checkedRowKeys.value.filter((key) => key !== pendingRemoval.value?.id)
  pendingRemoval.value = undefined
}
</script>

<template>
  <section class="page">
    <NCard :bordered="false" class="query-card">
      <div class="mobile-table-toolbar">
        <NButton size="small" secondary circle @click="showMobileFilters = true">
          <template #icon>
            <Filter :size="16" />
          </template>
        </NButton>
        <NButton size="small" type="error" secondary @click="requestBatchRemove">批量删除</NButton>
        <NButton size="small" type="primary" @click="store.refreshFundPrices">刷新净值</NButton>
        <NButton class="account-create-button" size="small" type="primary" :disabled="!canCreate" @click="openCreateModal">新增基金</NButton>
      </div>
      <div class="account-filter-row desktop-filter-row">
        <label class="query-field">
          <span>账户</span>
          <NSelect
            v-model:value="selectedAccountFilter"
            class="account-filter-select"
            size="small"
            :options="fundAccountFilterOptions"
          />
        </label>
        <label class="query-field">
          <span>关键词</span>
          <NInput v-model:value="keywordFilter" class="asset-filter-input" size="small" placeholder="搜索代码/名称" clearable />
        </label>
        <NButton size="small" type="primary" @click="resetFilters">重置</NButton>
        <NButton size="small" type="error" secondary @click="requestBatchRemove">批量删除</NButton>
        <NButton size="small" type="primary" @click="store.refreshFundPrices">刷新净值</NButton>
        <NButton class="account-create-button" size="small" type="primary" :disabled="!canCreate" @click="openCreateModal">新增基金</NButton>
      </div>
    </NCard>

    <NCard :bordered="false" class="table-card">
      <NDataTable
        :columns="fundColumns"
        :data="fundPositions"
        bordered
        flex-height
        :max-height="fundTableMaxHeight"
        :scroll-x="fundTableScrollX"
        :pagination="tablePagination"
        :row-key="rowKey"
        v-model:checked-row-keys="checkedRowKeys"
      >
        <template #empty>
          <div class="table-empty-state">
            <NEmpty size="small" :description="fundTableEmptyText" />
          </div>
        </template>
      </NDataTable>
    </NCard>

    <NModal v-model:show="showMobileFilters" preset="card" title="筛选条件" class="account-create-modal">
      <div class="mobile-filter-panel">
        <label class="query-field">
          <span>账户</span>
          <NSelect v-model:value="selectedAccountFilter" class="account-filter-select" size="small" :options="fundAccountFilterOptions" />
        </label>
        <label class="query-field">
          <span>关键词</span>
          <NInput v-model:value="keywordFilter" class="asset-filter-input" size="small" placeholder="搜索代码/名称" clearable />
        </label>
        <div class="form-actions modal-actions">
          <NButton size="small" secondary @click="showMobileFilters = false">取消</NButton>
          <NButton size="small" type="primary" @click="resetFilters">重置</NButton>
          <NButton size="small" type="primary" @click="showMobileFilters = false">完成</NButton>
        </div>
      </div>
    </NModal>

    <NModal v-model:show="showCreateModal" preset="card" :title="isEditing ? '编辑基金' : '新增基金'" class="position-create-modal">
      <NForm
        ref="formRef"
        class="account-form create-form"
        label-placement="left"
        label-align="right"
        :label-width="96"
        :model="form"
        :rules="rules"
        @submit.prevent="submit"
      >
        <NFormItem label="账户" path="accountId" class="account-name-field">
          <NSelect
            v-model:value="form.accountId"
            size="small"
            :disabled="isEditing"
            :options="fundAccounts.map((account) => ({ label: account.name, value: account.id }))"
          />
        </NFormItem>
        <NFormItem label="币种" class="account-name-field">
          <NInput :value="currencyLabels[form.currency]" size="small" disabled />
        </NFormItem>
        <NFormItem label="名称/代码" path="symbol" class="account-name-field">
          <div class="asset-search-field modal-field">
            <NInput
              v-model:value="form.symbol"
              size="small"
              autocomplete="off"
              placeholder="请输入基金代码或名称搜索"
              :disabled="isEditing"
              @focus="fundSearchFocused = true"
              @input="fundSearchFocused = true"
              @blur="refreshNav"
              @keydown.escape="fundSearchFocused = false"
            />
          <span v-if="fundSearchLoading" class="field-hint">正在联网搜索...</span>
          <NAlert v-if="navError" class="field-alert" :show-icon="false" type="warning">
            {{ navError }}
          </NAlert>
          <div v-if="showFundCandidates" class="asset-suggestions">
            <NButton
              v-for="candidate in fundCandidates"
              :key="`${candidate.market}:${candidate.symbol}:${candidate.currency}`"
              class="asset-suggestion"
              text
              @mousedown.prevent="selectFund(candidate)"
            >
              <span>
                <strong>{{ candidate.name }}</strong>
                {{ candidate.symbol }}
              </span>
              <small>中国基金 · {{ currencyLabels[candidate.currency] }}</small>
            </NButton>
          </div>
          </div>
        </NFormItem>
        <NFormItem label="持有份额" path="quantity" class="account-name-field">
          <NInputNumber v-model:value="form.quantity" size="small" :min="0" :step="0.000001" />
        </NFormItem>
        <NFormItem label="持有收益" path="holdingProfit" class="account-name-field">
          <NInputNumber v-model:value="form.holdingProfit" size="small" :step="0.01" placeholder="可填负数" />
        </NFormItem>
        <NFormItem label="最新净值" class="account-name-field">
          <NInput
            :value="form.currentPrice ? formatNav(form.currentPrice) : navLoading ? '正在自动获取...' : '选择基金或输入代码后自动获取'"
            size="small"
            disabled
          />
        </NFormItem>
        <NFormItem label="净值日期" class="account-name-field">
          <NInput :value="form.priceDate || '自动获取'" size="small" disabled />
        </NFormItem>
      <div class="form-footer">
        <NButton size="small" @click="showCreateModal = false">取消</NButton>
        <NButton size="small" type="primary" :disabled="!canCreate || navLoading" @click="submit">{{ isEditing ? '确认保存' : '确认新增' }}</NButton>
        <span v-if="store.error" class="negative">{{ store.error }}</span>
      </div>
      </NForm>
    </NModal>

    <div v-if="pendingRemoval" class="modal-backdrop" @click.self="pendingRemoval = undefined">
      <section class="modal">
        <h3>删除基金</h3>
        <p>确定要删除「{{ pendingRemoval.name }}」吗？这个操作会从当前基金列表中移除它。</p>
        <div class="form-actions modal-actions">
          <NButton size="small" @click="pendingRemoval = undefined">取消</NButton>
          <NButton size="small" type="error" @click="confirmRemovePosition">确认删除</NButton>
        </div>
      </section>
    </div>

    <NModal v-model:show="showBatchRemoveModal" preset="card" title="批量删除基金" class="account-create-modal">
      <p class="modal-copy">确定要删除已选择的 {{ selectedBatchPositions.length }} 条基金持仓吗？</p>
      <div class="form-actions modal-actions">
        <NButton size="small" @click="showBatchRemoveModal = false">取消</NButton>
        <NButton size="small" type="error" @click="confirmBatchRemove">确认删除</NButton>
      </div>
    </NModal>
  </section>
</template>
