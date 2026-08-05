<script setup lang="ts">
import type { DataTableColumns, DataTableRowKey, FormInst, FormRules } from 'naive-ui'
import { NButton, NCard, NDataTable, NForm, NFormItem, NInputNumber, NModal, NPopconfirm, NSelect, useMessage } from 'naive-ui'
import { h } from 'vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { Account, AccountType, CurrencyCode, PositionValuation } from '@/types/domain'
import { accountMatchesTypes, cashAccountTypes, currencyForAccountType } from '@/utils/accountType'
import { formatCurrency } from '@/utils/format'
import { createTablePagination, pageAfterRemoval } from '@/utils/tablePagination'

const store = usePortfolioStore()
const message = useMessage()
const currencyLabels: Record<CurrencyCode, string> = {
  CNY: '人民币',
  USD: '美元',
  HKD: '港币',
  JPY: '日元',
  EUR: '欧元',
  GBP: '英镑',
  OTHER: '其他币种'
}
const cashTypeByCurrency: Record<'CNY' | 'USD' | 'HKD', AccountType> = {
  CNY: 'cny_cash',
  USD: 'usd_cash',
  HKD: 'hkd_cash'
}
const cashSymbolByCurrency: Record<'CNY' | 'USD' | 'HKD', string> = {
  CNY: 'CASH_CNY',
  USD: 'CASH_USD',
  HKD: 'CASH_HKD'
}

const form = reactive({
  currency: 'CNY' as 'CNY' | 'USD' | 'HKD',
  balance: 0
})
const formRef = ref<FormInst | null>(null)
const checkedRowKeys = ref<DataTableRowKey[]>([])
const showBatchRemoveModal = ref(false)
const currencyOptions = [
  { label: '人民币', value: 'CNY' },
  { label: '美元', value: 'USD' },
  { label: '港币', value: 'HKD' }
]

const cashAccounts = computed(() => store.accounts.filter((account) => accountMatchesTypes(account, cashAccountTypes)))
const cashPositions = computed(() => store.summary?.positions.filter((item) => item.assetType === 'cash') ?? [])
const tableMaxHeight = 'calc(100vh - 278px)'
const tablePage = ref(1)
const tablePageSize = ref(10)
const tablePagination = computed(() => createTablePagination(tablePage, tablePageSize))
const selectedBatchPositions = computed(() =>
  cashPositions.value.filter((position) => checkedRowKeys.value.includes(position.positionId))
)
const cashColumns: DataTableColumns<PositionValuation> = [
  {
    type: 'selection'
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
    width: 96,
    render: (row) =>
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
  }
]
const rules: FormRules = {
  currency: {
    required: true,
    message: '请选择币种',
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

onMounted(() => store.refresh())

async function submit() {
  try {
    await formRef.value?.validate()
    const account = await ensureCashAccount(form.currency)
    await store.savePosition({
      accountId: account.id,
      assetType: 'cash',
      symbol: cashSymbolByCurrency[form.currency],
      name: `${currencyLabels[form.currency]}现金`,
      market: 'CASH',
      currency: form.currency,
      quantity: Number(form.balance),
      averageCost: 1
    })
    form.balance = 0
  } catch {
    // The store owns the user-facing error message.
  }
}

async function ensureCashAccount(currency: 'CNY' | 'USD' | 'HKD'): Promise<Account> {
  const existing = cashAccounts.value.find((account) => currencyForAccountType(account.type) === currency)
  if (existing) return existing
  const type = cashTypeByCurrency[currency]
  return store.saveAccount({ name: `${currencyLabels[currency]}现金`, type })
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
      <NForm
        ref="formRef"
        class="cash-form"
        label-placement="left"
        label-align="right"
        :label-width="56"
        :model="form"
        :rules="rules"
        @submit.prevent="submit"
      >
        <NFormItem label="币种" path="currency">
          <NSelect v-model:value="form.currency" size="small" :options="currencyOptions" />
        </NFormItem>
        <NFormItem label="余额" path="balance">
          <NInputNumber v-model:value="form.balance" size="small" :min="0" :step="0.01" />
        </NFormItem>
        <NButton size="small" type="primary" @click="submit">保存现金余额</NButton>
        <NButton size="small" type="error" secondary @click="requestBatchRemove">批量删除</NButton>
        <span v-if="store.error" class="negative">{{ store.error }}</span>
      </NForm>
    </NCard>

    <NCard :bordered="false" class="table-card">
      <NDataTable
        :columns="cashColumns"
        :data="cashPositions"
        :bordered="false"
        flex-height
        :max-height="tableMaxHeight"
        :pagination="tablePagination"
        :row-key="rowKey"
        v-model:checked-row-keys="checkedRowKeys"
      />
    </NCard>

    <NModal v-model:show="showBatchRemoveModal" preset="card" title="批量删除现金" class="account-create-modal">
      <p class="modal-copy">确定要删除已选择的 {{ selectedBatchPositions.length }} 条现金记录吗？</p>
      <div class="form-actions modal-actions">
        <NButton size="small" @click="showBatchRemoveModal = false">取消</NButton>
        <NButton size="small" type="error" @click="confirmBatchRemove">确认删除</NButton>
      </div>
    </NModal>
  </section>
</template>
