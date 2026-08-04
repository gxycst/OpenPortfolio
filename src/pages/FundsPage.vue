<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { fetchLatestFundNav, type FundNavQuote } from '@/providers/funds/eastmoneyFundNavProvider'
import type { AssetCandidate } from '@/providers/manualAssetCatalog'
import { searchAssetCandidatesOnline } from '@/services/assetSearchService'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { CurrencyCode } from '@/types/domain'
import { accountMatchesTypes, currencyForAccountType, fundAccountTypes } from '@/utils/accountType'
import { formatCurrency, formatPercent } from '@/utils/format'

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
const fundSearchFocused = ref(false)
const fundCandidates = ref<AssetCandidate[]>([])
const fundSearchLoading = ref(false)
const navLoading = ref(false)
const navError = ref('')
const pendingRemoval = ref<{ id: string; name: string } | undefined>()

const fundAccounts = computed(() => store.accounts.filter((account) => accountMatchesTypes(account, fundAccountTypes)))
const selectedAccount = computed(() => fundAccounts.value.find((account) => account.id === form.accountId))
const fundPositions = computed(() => store.summary?.positions.filter((item) => item.assetType === 'fund') ?? [])
const canCreate = computed(() => fundAccounts.value.length > 0)
const showFundCandidates = computed(() => fundSearchFocused.value && fundCandidates.value.length > 0)
let searchTimer: ReturnType<typeof setTimeout> | undefined

onMounted(async () => {
  await store.refresh()
  form.accountId = fundAccounts.value[0]?.id ?? ''
  syncAccountCurrency()
})

watch(
  () => form.accountId,
  () => syncAccountCurrency()
)

watch(
  () => form.symbol,
  (query) => {
    fundSearchFocused.value = true
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(async () => {
      fundSearchLoading.value = true
      fundCandidates.value = (await searchAssetCandidatesOnline(query, store.assets)).filter(
        (candidate) => candidate.assetType === 'fund'
      )
      fundSearchLoading.value = false
    }, 250)
  }
)

async function selectFund(candidate: AssetCandidate) {
  form.symbol = candidate.symbol
  form.name = candidate.name
  syncAccountCurrency()
  fundSearchFocused.value = false
  await refreshNav()
}

function syncAccountCurrency() {
  if (!selectedAccount.value) return
  form.currency = currencyForAccountType(selectedAccount.value.type)
}

async function refreshNav() {
  if (!form.symbol.trim()) return
  navLoading.value = true
  navError.value = ''
  try {
    const quote = await fetchLatestFundNav(form.symbol)
    applyNavQuote(quote)
  } catch (error) {
    navError.value = error instanceof Error ? error.message : '净值获取失败'
  } finally {
    navLoading.value = false
  }
}

function applyNavQuote(quote: FundNavQuote) {
  form.symbol = quote.fundCode
  form.name = form.name || quote.name
  form.currentPrice = quote.nav
  form.priceDate = quote.navDate
  form.priceProviderId = quote.providerId
}

async function submit() {
  try {
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
    })
    form.symbol = ''
    form.name = ''
    form.quantity = 0
    form.holdingProfit = undefined
    form.currentPrice = undefined
    form.priceDate = ''
    form.priceProviderId = ''
    await store.refresh()
  } catch {
    // The store owns the user-facing error message.
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
  await store.removePosition(pendingRemoval.value.id)
  pendingRemoval.value = undefined
}
</script>

<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h2>基金</h2>
        <p>按基金代码获取最新净值，录入份额和持有收益后计算收益率。</p>
      </div>
      <button type="button" @click="store.refreshFundPrices">刷新净值</button>
    </header>

    <div v-if="!canCreate" class="notice">请先创建人民币基金、美元基金或港元基金账户，再录入基金。</div>

    <form class="card grid" @submit.prevent="submit">
      <div class="form-grid">
        <label>
          账户
          <select v-model="form.accountId" required>
            <option v-for="account in fundAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </label>
        <label>币种<input :value="currencyLabels[form.currency]" disabled /></label>
        <label class="asset-search-field">
          基金代码/名称
          <input
            v-model="form.symbol"
            autocomplete="off"
            required
            placeholder="输入基金代码或名称"
            @focus="fundSearchFocused = true"
            @input="fundSearchFocused = true"
            @blur="refreshNav"
            @keydown.escape="fundSearchFocused = false"
          />
          <span v-if="fundSearchLoading" class="field-hint">正在联网搜索...</span>
          <div v-if="showFundCandidates" class="asset-suggestions">
            <button
              v-for="candidate in fundCandidates"
              :key="`${candidate.market}:${candidate.symbol}:${candidate.currency}`"
              class="asset-suggestion"
              type="button"
              @mousedown.prevent="selectFund(candidate)"
            >
              <span>
                <strong>{{ candidate.name }}</strong>
                {{ candidate.symbol }}
              </span>
              <small>中国基金 · {{ currencyLabels[candidate.currency] }}</small>
            </button>
          </div>
        </label>
        <label>基金名称<input v-model="form.name" placeholder="选择基金后自动填入" /></label>
        <label>持有份额<input v-model.number="form.quantity" min="0" step="0.000001" type="number" /></label>
        <label>持有收益<input v-model.number="form.holdingProfit" step="0.01" type="number" placeholder="可填负数" /></label>
        <label>
          最新净值
          <input v-model.number="form.currentPrice" min="0" step="0.000001" type="number" />
        </label>
        <label>净值日期<input v-model="form.priceDate" placeholder="自动获取" /></label>
      </div>
      <div class="form-actions">
        <button type="button" class="secondary" :disabled="navLoading" @click="refreshNav">
          {{ navLoading ? '获取中...' : '获取最新净值' }}
        </button>
        <button type="submit" :disabled="!canCreate">新增基金</button>
        <span v-if="navError" class="negative">{{ navError }}</span>
        <span v-if="store.error" class="negative">{{ store.error }}</span>
      </div>
    </form>

    <article class="card">
      <table>
        <thead>
          <tr>
            <th>基金</th>
            <th>份额</th>
            <th>最新净值</th>
            <th>净值日期</th>
            <th>市值</th>
            <th>盈亏</th>
            <th>收益率</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="position in fundPositions" :key="position.positionId">
            <td>{{ position.assetName }} <span class="muted">{{ position.assetSymbol }}</span></td>
            <td>{{ position.quantity }}</td>
            <td>{{ position.currentPrice ?? '缺失' }}</td>
            <td>{{ position.priceDate ?? '缺失' }}</td>
            <td>{{ formatCurrency(position.marketValue, position.nativeCurrency) }}</td>
            <td :class="{ positive: (position.profitLoss ?? 0) >= 0, negative: (position.profitLoss ?? 0) < 0 }">
              {{ formatCurrency(position.profitLoss, position.nativeCurrency) }}
            </td>
            <td>{{ formatPercent(position.profitRate) }}</td>
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
        <h3>删除基金</h3>
        <p>确定要删除「{{ pendingRemoval.name }}」吗？这个操作会从当前基金列表中移除它。</p>
        <div class="form-actions">
          <button class="secondary" type="button" @click="pendingRemoval = undefined">取消</button>
          <button class="danger" type="button" @click="confirmRemovePosition">确认删除</button>
        </div>
      </section>
    </div>
  </section>
</template>
