<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { Account, AccountType, CurrencyCode } from '@/types/domain'
import { accountMatchesTypes, cashAccountTypes, currencyForAccountType } from '@/utils/accountType'
import { formatCurrency } from '@/utils/format'

const store = usePortfolioStore()
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
const pendingRemoval = ref<{ id: string; name: string } | undefined>()

const cashAccounts = computed(() => store.accounts.filter((account) => accountMatchesTypes(account, cashAccountTypes)))
const cashPositions = computed(() => store.summary?.positions.filter((item) => item.assetType === 'cash') ?? [])

onMounted(() => store.refresh())

async function submit() {
  try {
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

function requestRemovePosition(positionId: string, assetName: string) {
  pendingRemoval.value = { id: positionId, name: assetName }
}

async function confirmRemovePosition() {
  if (!pendingRemoval.value) return
  await store.removePosition(pendingRemoval.value.id)
  pendingRemoval.value = undefined
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>现金</h2>
        <p>记录人民币、美元和港币现金余额。</p>
      </div>
    </header>

    <form class="card grid" @submit.prevent="submit">
      <div class="form-grid">
        <label>
          币种
          <select v-model="form.currency">
            <option value="CNY">人民币</option>
            <option value="USD">美元</option>
            <option value="HKD">港币</option>
          </select>
        </label>
        <label>余额<input v-model.number="form.balance" min="0" step="0.01" type="number" /></label>
      </div>
      <div class="form-actions">
        <button type="submit">保存现金余额</button>
        <span v-if="store.error" class="negative">{{ store.error }}</span>
      </div>
    </form>

    <article class="card">
      <table>
        <thead>
          <tr>
            <th>币种</th>
            <th>余额</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in cashPositions" :key="position.positionId">
            <td>{{ currencyLabels[position.nativeCurrency] }}</td>
            <td>{{ formatCurrency(position.marketValue, position.nativeCurrency) }}</td>
            <td>
              <button class="danger" type="button" @click="requestRemovePosition(position.positionId, position.assetName)">
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </article>

    <div v-if="pendingRemoval" class="modal-backdrop" @click.self="pendingRemoval = undefined">
      <section class="modal">
        <h3>删除现金</h3>
        <p>确定要删除「{{ pendingRemoval.name }}」吗？这个操作会从现金列表中移除它。</p>
        <div class="form-actions">
          <button class="secondary" type="button" @click="pendingRemoval = undefined">取消</button>
          <button class="danger" type="button" @click="confirmRemovePosition">确认删除</button>
        </div>
      </section>
    </div>
  </section>
</template>
