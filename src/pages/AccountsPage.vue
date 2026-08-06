<script setup lang="ts">
import type { DataTableColumns, DataTableRowKey, FormInst, FormRules } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NPopconfirm,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  useMessage
} from 'naive-ui'
import { h, nextTick } from 'vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { Account, AccountType, CurrencyCode } from '@/types/domain'
import { currencyForAccountType } from '@/utils/accountType'
import { createTablePagination, pageAfterRemoval } from '@/utils/tablePagination'

const store = usePortfolioStore()
const message = useMessage()
type AccountCategory = 'stock' | 'fund' | 'cash'

const currencyLabels: Record<CurrencyCode, string> = {
  CNY: '人民币',
  USD: '美元',
  HKD: '港币',
  JPY: '日元',
  EUR: '欧元',
  GBP: '英镑',
  OTHER: '其他币种'
}
const categoryLabels: Record<AccountCategory, string> = {
  stock: '股票',
  fund: '基金',
  cash: '现金'
}
const categoryOptions: Array<{ label: string; value: AccountCategory }> = [
  { label: categoryLabels.stock, value: 'stock' },
  { label: categoryLabels.fund, value: 'fund' },
  { label: categoryLabels.cash, value: 'cash' }
]
const currencyOptions: Array<{ label: string; value: CurrencyCode }> = [
  { label: '人民币', value: 'CNY' },
  { label: '美元', value: 'USD' },
  { label: '港元', value: 'HKD' }
]
const form = reactive({
  name: '',
  category: 'stock' as AccountCategory,
  currency: 'CNY' as CurrencyCode
})
const formRef = ref<FormInst | null>(null)
const showCreateModal = ref(false)
const showBatchRemoveModal = ref(false)
const selectedCategory = ref<AccountCategory | ''>('')
const selectedCurrency = ref<CurrencyCode | ''>('')
const checkedRowKeys = ref<DataTableRowKey[]>([])
const filteredAccounts = computed(() =>
  store.accounts.filter((account) => {
    const categoryMatches = selectedCategory.value ? categoryForAccountType(account.type) === selectedCategory.value : true
    const currencyMatches = selectedCurrency.value ? account.defaultCurrency === selectedCurrency.value : true
    return categoryMatches && currencyMatches
  })
)
const categoryFilterOptions: Array<{ label: string; value: AccountCategory | '' }> = [
  { label: '全部', value: '' },
  ...categoryOptions
]
const currencyFilterOptions: Array<{ label: string; value: CurrencyCode | '' }> = [
  { label: '全部', value: '' },
  ...currencyOptions
]
const tableMaxHeight = 'calc(100vh - 278px)'
const tablePage = ref(1)
const tablePageSize = ref(10)
const tablePagination = computed(() => createTablePagination(tablePage, tablePageSize))
const selectedBatchAccounts = computed(() =>
  filteredAccounts.value.filter((account) => checkedRowKeys.value.includes(account.id))
)
const accountTableEmptyText = computed(() => (store.accounts.length === 0 ? '暂无账户' : '暂无匹配账户'))
const columns: DataTableColumns<Account> = [
  {
    type: 'selection'
  },
  {
    title: '名称',
    key: 'name'
  },
  {
    title: '类型',
    key: 'type',
    render: (row) => categoryLabels[categoryForAccountType(row.type)]
  },
  {
    title: '币种',
    key: 'defaultCurrency',
    render: (row) => currencyLabels[row.defaultCurrency]
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
          onPositiveClick: () => removeSingleAccount(row.id)
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
          default: () => `确定要删除账户「${row.name}」吗？`
        }
      )
  }
]
const rules: FormRules = {
  name: {
    required: true,
    message: '请输入账户名称',
    trigger: ['input', 'blur']
  },
  category: {
    required: true,
    message: '请选择类型',
    trigger: ['change']
  },
  currency: {
    required: true,
    message: '请选择币种',
    trigger: ['change']
  }
}

onMounted(() => store.refresh())

watch([selectedCategory, selectedCurrency], () => {
  tablePage.value = 1
  checkedRowKeys.value = []
})

async function submit() {
  await formRef.value?.validate()
  await store.saveAccount({
    name: form.name,
    type: accountTypeFromParts(form.category, form.currency)
  })
  resetCreateForm()
  showCreateModal.value = false
}

function resetCreateForm() {
  form.name = ''
  form.category = 'stock'
  form.currency = 'CNY'
  formRef.value?.restoreValidation()
}

async function openCreateModal() {
  resetCreateForm()
  showCreateModal.value = true
  await nextTick()
  formRef.value?.restoreValidation()
}

function resetFilters() {
  selectedCategory.value = ''
  selectedCurrency.value = ''
}

function rowKey(row: Account): string {
  return row.id
}

function requestBatchRemove() {
  if (checkedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的表格行')
    return
  }
  showBatchRemoveModal.value = true
}

async function confirmBatchRemove() {
  try {
    const ids = selectedBatchAccounts.value.map((account) => account.id)
    const remainingCount = filteredAccounts.value.length - ids.length
    await store.removeAccounts(ids)
    checkedRowKeys.value = []
    tablePage.value = pageAfterRemoval(tablePage.value, tablePageSize.value, remainingCount)
    showBatchRemoveModal.value = false
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '账户删除失败')
  }
}

async function removeSingleAccount(id: string) {
  try {
    const remainingCount = filteredAccounts.value.some((account) => account.id === id)
      ? filteredAccounts.value.length - 1
      : filteredAccounts.value.length
    await store.removeAccount(id)
    tablePage.value = pageAfterRemoval(tablePage.value, tablePageSize.value, remainingCount)
    checkedRowKeys.value = checkedRowKeys.value.filter((key) => key !== id)
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '账户删除失败')
  }
}

function accountTypeFromParts(category: AccountCategory, currency: CurrencyCode): AccountType {
  if (category === 'stock') {
    if (currency === 'USD') return 'us_stock'
    if (currency === 'HKD') return 'hk_stock'
    return 'cn_stock'
  }
  if (category === 'fund') {
    if (currency === 'USD') return 'usd_fund'
    if (currency === 'HKD') return 'hkd_fund'
    return 'cny_fund'
  }
  if (currency === 'USD') return 'usd_cash'
  if (currency === 'HKD') return 'hkd_cash'
  return 'cny_cash'
}

function categoryForAccountType(type: AccountType): AccountCategory {
  if (type.includes('fund') || type === 'fund_platform') return 'fund'
  if (type.includes('cash') || type === 'bank' || type === 'cash') return 'cash'
  return 'stock'
}
</script>

<template>
  <section class="page">
    <NCard :bordered="false" class="query-card">
      <div class="account-filter-row">
        <label class="query-field">
          <span>类型</span>
          <NSelect v-model:value="selectedCategory" class="account-filter-select" size="small" :options="categoryFilterOptions" />
        </label>
        <label class="query-field">
          <span>币种</span>
          <NSelect v-model:value="selectedCurrency" class="account-filter-select" size="small" :options="currencyFilterOptions" />
        </label>
        <NButton size="small" type="primary" @click="resetFilters">重置</NButton>
        <NButton size="small" type="error" secondary @click="requestBatchRemove">批量删除</NButton>
        <NButton class="account-create-button" size="small" type="primary" @click="openCreateModal">新增账户</NButton>
      </div>
    </NCard>

    <NCard :bordered="false" class="table-card">
      <NDataTable
        :columns="columns"
        :data="filteredAccounts"
        bordered
        flex-height
        :max-height="tableMaxHeight"
        :pagination="tablePagination"
        :row-key="rowKey"
        v-model:checked-row-keys="checkedRowKeys"
      >
        <template #empty>
          <div class="table-empty-state">
            <NEmpty size="small" :description="accountTableEmptyText" />
          </div>
        </template>
      </NDataTable>
    </NCard>

    <NModal v-model:show="showCreateModal" preset="card" title="新增账户" class="account-create-modal">
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
        <NFormItem label="账户名称" path="name" class="account-name-field">
          <NInput v-model:value="form.name" size="small" placeholder="例如 嘉信理财" />
        </NFormItem>
        <NFormItem label="类型" path="category" class="account-radio-field">
          <NRadioGroup v-model:value="form.category" name="account-category" size="small">
            <NSpace :size="6" align="center">
              <NRadio v-for="option in categoryOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
        <NFormItem label="币种" path="currency" class="account-radio-field">
          <NRadioGroup v-model:value="form.currency" name="account-currency" size="small">
            <NSpace :size="6" align="center">
              <NRadio v-for="option in currencyOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </NRadio>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
        <div class="form-footer">
          <span v-if="store.error" class="negative">{{ store.error }}</span>
          <NButton size="small" @click="showCreateModal = false">取消</NButton>
          <NButton size="small" type="primary" @click="submit">确认新增</NButton>
        </div>
      </NForm>
    </NModal>

    <NModal v-model:show="showBatchRemoveModal" preset="card" title="批量删除账户" class="account-create-modal">
      <p class="modal-copy">确定要删除已选择的 {{ selectedBatchAccounts.length }} 个账户吗？</p>
      <div class="form-actions modal-actions">
        <NButton size="small" @click="showBatchRemoveModal = false">取消</NButton>
        <NButton size="small" type="error" @click="confirmBatchRemove">确认删除</NButton>
      </div>
    </NModal>
  </section>
</template>
