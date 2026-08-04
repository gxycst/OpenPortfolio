<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { NButton, NCard, NDataTable, NForm, NFormItem, NInput, NPopconfirm, NRadioButton, NRadioGroup, NSpace } from 'naive-ui'
import { h } from 'vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { AccountType, CurrencyCode, MarketCode } from '@/types/domain'
import { accountTypeLabels } from '@/utils/accountType'

const store = usePortfolioStore()
const marketLabels: Record<MarketCode, string> = {
  CN: '中国',
  US: '美国',
  HK: '香港',
  JP: '日本',
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
const accountTypeOptions: AccountType[] = [
  'cn_stock',
  'us_stock',
  'hk_stock',
  'cny_fund',
  'usd_fund',
  'hkd_fund',
  'cny_cash',
  'usd_cash',
  'hkd_cash'
]
const form = reactive({
  name: '',
  type: 'cn_stock' as AccountType
})
const selectedType = ref<AccountType | ''>('')
const filteredAccounts = computed(() =>
  selectedType.value ? store.accounts.filter((account) => account.type === selectedType.value) : store.accounts
)
const typeRadioOptions = accountTypeOptions.map((type) => ({
  label: accountTypeLabels[type],
  value: type
}))
const filterOptions = [{ label: '全部', value: '' }, ...typeRadioOptions]
const columns: DataTableColumns<(typeof store.accounts)[number]> = [
  {
    title: '名称',
    key: 'name'
  },
  {
    title: '类型',
    key: 'type',
    render: (row) => accountTypeLabels[row.type]
  },
  {
    title: '币种',
    key: 'defaultCurrency',
    render: (row) => currencyLabels[row.defaultCurrency]
  },
  {
    title: '',
    key: 'actions',
    width: 96,
    render: (row) =>
      h(
        NPopconfirm,
        {
          positiveText: '确认删除',
          negativeText: '取消',
          onPositiveClick: () => store.removeAccount(row.id)
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

onMounted(() => store.refresh())

async function submit() {
  await store.saveAccount({ ...form })
  form.name = ''
}

function resetFilters() {
  selectedType.value = ''
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>账户</h2>
        <p>创建股票、基金和现金账户；币种会根据账户类型自动确定。</p>
      </div>
    </header>

    <NCard :bordered="false">
      <NForm class="account-form" label-placement="left" :show-feedback="false" @submit.prevent="submit">
        <NFormItem label="账户名称" class="name-field">
          <NInput v-model:value="form.name" size="small" placeholder="例如 嘉信理财" />
        </NFormItem>
        <NFormItem label="类型" class="type-field">
          <NRadioGroup v-model:value="form.type" name="account-type" size="small">
            <NSpace :size="6" align="center">
              <NRadioButton v-for="option in typeRadioOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </NRadioButton>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
        <div class="form-footer">
          <span v-if="store.error" class="negative">{{ store.error }}</span>
          <NButton size="small" type="primary" @click="submit">新增账户</NButton>
        </div>
      </NForm>
    </NCard>

    <NCard :bordered="false">
      <NSpace vertical :size="16">
        <NFormItem class="filter-inline" label="类型筛选" label-placement="left" :show-feedback="false">
          <NRadioGroup v-model:value="selectedType" name="account-type-filter" size="small">
            <NSpace :size="6" align="center">
              <NRadioButton v-for="option in filterOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </NRadioButton>
              <NButton size="small" type="primary" @click="resetFilters">重置</NButton>
            </NSpace>
          </NRadioGroup>
        </NFormItem>
        <NDataTable :columns="columns" :data="filteredAccounts" :bordered="false" />
      </NSpace>
    </NCard>
  </section>
</template>
