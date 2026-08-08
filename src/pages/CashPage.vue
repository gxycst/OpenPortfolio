<script setup lang="ts">
import type { DataTableColumns, DataTableRowKey, FormInst, FormRules } from 'naive-ui'
import { NButton, NCard, NDataTable, NEmpty, NForm, NFormItem, NInput, NInputNumber, NModal, NPopconfirm, NSelect, useMessage } from 'naive-ui'
import { h, nextTick } from 'vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { Account, CurrencyCode, PositionValuation } from '@/types/domain'
import { currencyForAccountType } from '@/utils/accountType'
import { formatCurrency } from '@/utils/format'
import { createTablePagination, pageAfterRemoval } from '@/utils/tablePagination'
import { useIsMobile } from '@/composables/useIsMobile'
import { Filter } from 'lucide-vue-next'

const store = usePortfolioStore()
const message = useMessage()
type CashCurrency = 'CNY' | 'USD' | 'HKD'
const currencyLabels: Record<CurrencyCode, string> = {
  CNY: '人民币',
  USD: '美元',
  HKD: '港币',
  JPY: '日元',
  EUR: '欧元',
  GBP: '英镑',
  OTHER: '其他币种'
}
const cashSymbolByCurrency: Record<CashCurrency, string> = {
  CNY: 'CASH_CNY',
  USD: 'CASH_USD',
  HKD: 'CASH_HKD'
}

const form = reactive({
  accountId: '',
  balance: 0
})
const formRef = ref<FormInst | null>(null)
const checkedRowKeys = ref<DataTableRowKey[]>([])
const showCreateModal = ref(false)
const showBatchRemoveModal = ref(false)
const showMobileFilters = ref(false)
const editingPositionId = ref<string | undefined>()
const selectedAccount = ref('')
const selectedCurrency = ref<CurrencyCode | ''>('')
const currencyOptions: Array<{ label: string; value: CashCurrency }> = [
  { label: '人民币', value: 'CNY' },
  { label: '美元', value: 'USD' },
  { label: '港币', value: 'HKD' }
]
const currencyFilterOptions: Array<{ label: string; value: CurrencyCode | '' }> = [
  { label: '全部', value: '' },
  ...currencyOptions
]

const accountNameById = computed(() => new Map(store.accounts.map((account) => [account.id, account.name])))
const accountFilterOptions = computed(() => [
  { label: '全部', value: '' },
  ...store.accounts.map((account) => ({ label: account.name, value: account.id }))
])
const accountOptions = computed(() => store.accounts.map((account) => ({ label: account.name, value: account.id })))
const formAccount = computed(() => store.accounts.find((account) => account.id === form.accountId))
const formCurrency = computed(() => cashCurrencyForAccount(formAccount.value))
const canCreate = computed(() => store.accounts.length > 0)
const isEditing = computed(() => Boolean(editingPositionId.value))
const isMobile = useIsMobile()
const cashTableEmptyText = computed(() =>
  canCreate.value ? '暂无现金记录' : '请先创建账户，再录入现金余额。'
)
const cashPositions = computed(() =>
  (store.summary?.positions ?? [])
    .filter((item) => item.assetType === 'cash')
    .filter((item) => (selectedAccount.value ? item.accountId === selectedAccount.value : true))
    .filter((item) => (selectedCurrency.value ? item.nativeCurrency === selectedCurrency.value : true))
)
const tableMaxHeight = 'var(--table-max-height)'
const tableScrollX = computed(() => (isMobile.value ? 560 : undefined))
const tablePage = ref(1)
const tablePageSize = ref(10)
const tablePagination = computed(() => createTablePagination(tablePage, tablePageSize))
const selectedBatchPositions = computed(() =>
  cashPositions.value.filter((position) => checkedRowKeys.value.includes(position.positionId))
)
const cashColumns = computed<DataTableColumns<PositionValuation>>(() => isMobile.value ? mobileCashColumns : desktopCashColumns)
const desktopCashColumns: DataTableColumns<PositionValuation> = [
  {
    type: 'selection'
  },
  {
    title: '账户',
    key: 'accountId',
    render: (row) => accountNameById.value.get(row.accountId) ?? '未知账户'
  },
  {
    title: '币种',
    key: 'nativeCurrency',
    render: (row) => currencyLabels[row.nativeCurrency]
  },
  {
    title: '余额',
    key: 'marketValue',
    render: (row) => formatCurrency(row.marketValue, row.nativeCurrency)
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
          NPopconfirm,
          {
            positiveText: '确认删除',
            negativeText: '取消',
            onPositiveClick: () => removeSinglePosition(row.positionId)
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  type: 'error',
                  secondary: true
                },
                { default: () => '删除' }
              ),
            default: () => `确定要删除「${row.assetName}」吗？`
          }
        )
      ])
  }
]
const mobileCashColumns: DataTableColumns<PositionValuation> = [
  {
    type: 'selection',
    width: 42
  },
  {
    title: '现金',
    key: 'accountId',
    width: 210,
    render: (row) =>
      h('div', { class: 'mobile-main-cell' }, [
        h('strong', accountNameById.value.get(row.accountId) ?? '未知账户'),
        h('span', currencyLabels[row.nativeCurrency])
      ])
  },
  {
    title: '余额',
    key: 'marketValue',
    width: 150,
    className: 'nowrap-cell amount-cell',
    render: (row) => formatCurrency(row.marketValue, row.nativeCurrency)
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render: (row) => renderActionButtons(row)
  }
]
const rules: FormRules = {
  accountId: {
    required: true,
    message: '请选择账户',
    trigger: ['change']
  },
  balance: {
    required: true,
    type: 'number',
    validator: (_rule, value: number) => Number.isFinite(value) && value >= 0,
    message: '请输入有效余额',
    trigger: ['input', 'blur']
  }
}

onMounted(async () => {
  await store.refresh()
  form.accountId = store.accounts[0]?.id ?? ''
})

watch([selectedAccount, selectedCurrency], () => {
  tablePage.value = 1
  checkedRowKeys.value = []
})

async function submit() {
  try {
    await formRef.value?.validate()
    const currency = formCurrency.value
    await store.savePosition({
      accountId: form.accountId,
      assetType: 'cash',
      symbol: cashSymbolByCurrency[currency],
      name: `${currencyLabels[currency]}现金`,
      market: 'CASH',
      currency,
      quantity: Number(form.balance),
      averageCost: 1
    }, editingPositionId.value)
    resetCreateForm()
    showCreateModal.value = false
  } catch {
    // The store owns the user-facing error message.
  }
}

function resetCreateForm() {
  editingPositionId.value = undefined
  form.accountId = store.accounts[0]?.id ?? ''
  form.balance = 0
  formRef.value?.restoreValidation()
}

async function openEditModal(row: PositionValuation) {
  editingPositionId.value = row.positionId
  form.accountId = row.accountId
  form.balance = row.marketValue ?? row.quantity
  showCreateModal.value = true
  await nextTick()
  formRef.value?.restoreValidation()
}

async function openCreateModal() {
  resetCreateForm()
  showCreateModal.value = true
  await nextTick()
  formRef.value?.restoreValidation()
}

function resetFilters() {
  selectedAccount.value = ''
  selectedCurrency.value = ''
  showMobileFilters.value = false
}

function cashCurrencyForAccount(account: Account | undefined): CashCurrency {
  const currency = account ? currencyForAccountType(account.type) : 'CNY'
  if (currency === 'USD' || currency === 'HKD') return currency
  return 'CNY'
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
      NPopconfirm,
      {
        positiveText: '确认删除',
        negativeText: '取消',
        onPositiveClick: () => removeSinglePosition(row.positionId)
      },
      {
        trigger: () =>
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              secondary: true
            },
            { default: () => '删除' }
          ),
        default: () => `确定要删除「${row.assetName}」吗？`
      }
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

async function removeSinglePosition(id: string) {
  const remainingCount = cashPositions.value.some((position) => position.positionId === id)
    ? cashPositions.value.length - 1
    : cashPositions.value.length
  await store.removePosition(id)
  tablePage.value = pageAfterRemoval(tablePage.value, tablePageSize.value, remainingCount)
  checkedRowKeys.value = checkedRowKeys.value.filter((key) => key !== id)
}

async function confirmBatchRemove() {
  const ids = selectedBatchPositions.value.map((position) => position.positionId)
  const remainingCount = cashPositions.value.length - ids.length
  await store.removePositions(ids)
  checkedRowKeys.value = []
  tablePage.value = pageAfterRemoval(tablePage.value, tablePageSize.value, remainingCount)
  showBatchRemoveModal.value = false
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
        <NButton class="account-create-button" size="small" type="primary" :disabled="!canCreate" @click="openCreateModal">新增现金</NButton>
      </div>
      <div class="account-filter-row desktop-filter-row">
        <label class="query-field">
          <span>账户</span>
          <NSelect v-model:value="selectedAccount" class="account-filter-select" size="small" :options="accountFilterOptions" />
        </label>
        <label class="query-field">
          <span>币种</span>
          <NSelect v-model:value="selectedCurrency" class="account-filter-select" size="small" :options="currencyFilterOptions" />
        </label>
        <NButton size="small" type="primary" @click="resetFilters">重置</NButton>
        <NButton size="small" type="error" secondary @click="requestBatchRemove">批量删除</NButton>
        <NButton class="account-create-button" size="small" type="primary" :disabled="!canCreate" @click="openCreateModal">新增现金</NButton>
      </div>
    </NCard>

    <NCard :bordered="false" class="table-card">
      <NDataTable
        :columns="cashColumns"
        :data="cashPositions"
        bordered
        flex-height
        :max-height="tableMaxHeight"
        :scroll-x="tableScrollX"
        :pagination="tablePagination"
        :row-key="rowKey"
        v-model:checked-row-keys="checkedRowKeys"
      >
        <template #empty>
          <div class="table-empty-state">
            <NEmpty size="small" :description="cashTableEmptyText" />
          </div>
        </template>
      </NDataTable>
    </NCard>

    <NModal v-model:show="showMobileFilters" preset="card" title="筛选条件" class="account-create-modal">
      <div class="mobile-filter-panel">
        <label class="query-field">
          <span>账户</span>
          <NSelect v-model:value="selectedAccount" class="account-filter-select" size="small" :options="accountFilterOptions" />
        </label>
        <label class="query-field">
          <span>币种</span>
          <NSelect v-model:value="selectedCurrency" class="account-filter-select" size="small" :options="currencyFilterOptions" />
        </label>
        <div class="form-actions modal-actions">
          <NButton size="small" secondary @click="showMobileFilters = false">取消</NButton>
          <NButton size="small" type="primary" @click="resetFilters">重置</NButton>
          <NButton size="small" type="primary" @click="showMobileFilters = false">完成</NButton>
        </div>
      </div>
    </NModal>

    <NModal v-model:show="showCreateModal" preset="card" :title="isEditing ? '编辑现金' : '新增现金'" class="account-create-modal">
      <NForm
        ref="formRef"
        class="account-form create-form"
        label-placement="left"
        label-align="right"
        :label-width="56"
        :model="form"
        :rules="rules"
        @submit.prevent="submit"
      >
        <NFormItem label="账户" path="accountId" class="account-name-field">
          <NSelect v-model:value="form.accountId" size="small" :disabled="isEditing" :options="accountOptions" />
        </NFormItem>
        <NFormItem label="币种" class="account-name-field">
          <NInput :value="currencyLabels[formCurrency]" size="small" disabled />
        </NFormItem>
        <NFormItem label="余额" path="balance" class="account-name-field">
          <NInputNumber v-model:value="form.balance" size="small" :min="0" :step="0.01" />
        </NFormItem>
        <div class="form-footer">
          <span v-if="store.error" class="negative">{{ store.error }}</span>
          <NButton size="small" @click="showCreateModal = false">取消</NButton>
          <NButton size="small" type="primary" :disabled="!canCreate" @click="submit">{{ isEditing ? '确认保存' : '确认新增' }}</NButton>
        </div>
      </NForm>
    </NModal>

    <NModal v-model:show="showBatchRemoveModal" preset="card" title="批量删除现金" class="account-create-modal">
      <p class="modal-copy">确定要删除已选择的 {{ selectedBatchPositions.length }} 条现金记录吗？</p>
      <div class="form-actions modal-actions">
        <NButton size="small" @click="showBatchRemoveModal = false">取消</NButton>
        <NButton size="small" type="error" @click="confirmBatchRemove">确认删除</NButton>
      </div>
    </NModal>
  </section>
</template>
