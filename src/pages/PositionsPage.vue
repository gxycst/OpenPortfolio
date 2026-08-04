<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { AssetCandidate } from '@/providers/manualAssetCatalog'
import { searchAssetCandidatesOnline } from '@/services/assetSearchService'
import { usePortfolioStore } from '@/stores/portfolioStore'
import type { AssetType, CurrencyCode, MarketCode } from '@/types/domain'
import { accountMatchesTypes, currencyForAccountType, marketForAccountType, stockAccountTypes } from '@/utils/accountType'
import { formatCurrency, formatPercent } from '@/utils/format'

const store = usePortfolioStore()
const assetTypeLabels: Record<AssetType, string> = {
  stock: '股票',
  etf: 'ETF',
  fund: '场外基金',
  cash: '现金',
  bond: '债券',
  commodity: '商品',
  crypto: '加密资产',
  other: '其他资产'
}
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
const priceStatusLabels = {
  valid: '价格有效',
  stale: '可能过期',
  missing: '缺少价格'
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
const assetSearchFocused = ref(false)
const assetCandidates = ref<AssetCandidate[]>([])
const assetSearchLoading = ref(false)
const pendingRemoval = ref<{ id: string; name: string } | undefined>()

const stockAccounts = computed(() => store.accounts.filter((account) => accountMatchesTypes(account, stockAccountTypes)))
const selectedAccount = computed(() => stockAccounts.value.find((account) => account.id === form.accountId))
const canCreate = computed(() => stockAccounts.value.length > 0)
const showAssetCandidates = computed(() => assetSearchFocused.value && assetCandidates.value.length > 0)
let searchTimer: ReturnType<typeof setTimeout> | undefined

onMounted(async () => {
  await store.refresh()
  form.accountId = stockAccounts.value[0]?.id ?? ''
  syncAccountDerivedFields()
})

watch(
  () => form.accountId,
  () => syncAccountDerivedFields()
)

watch(
  () => form.symbol,
  (query) => {
    assetSearchFocused.value = true
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
    await store.savePosition({
      ...form,
      name: form.name.trim() || form.symbol.trim().toUpperCase(),
      currentPrice: form.assetType === 'cash' ? undefined : normalizeOptionalNumber(form.currentPrice),
      quantity: Number(form.quantity),
      averageCost: normalizeOptionalNumber(form.averageCost),
      holdingProfit: normalizeOptionalNumber(form.holdingProfit)
    })
    form.symbol = ''
    form.name = ''
    form.quantity = 0
    form.averageCost = undefined
    form.currentPrice = undefined
    form.holdingProfit = undefined
    form.note = ''
  } catch {
    // The store owns the user-facing error message.
  }
}

function selectAsset(candidate: AssetCandidate) {
  form.symbol = candidate.symbol
  form.name = candidate.name
  form.assetType = candidate.assetType
  syncAccountDerivedFields()
  assetSearchFocused.value = false
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
        <h2>持仓</h2>
        <p>录入股票和 ETF；基金与现金请到对应页面单独管理。</p>
      </div>
    </header>

    <div v-if="!canCreate" class="notice">请先创建 A股、美股或港股账户，再录入股票持仓。</div>

    <form class="card grid" @submit.prevent="submit">
      <div class="form-grid">
        <label>
          账户
          <select v-model="form.accountId" required>
            <option v-for="account in stockAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </label>
        <label>
          资产类型
          <select v-model="form.assetType">
            <option value="stock">股票</option>
            <option value="etf">ETF</option>
          </select>
        </label>
        <label class="asset-search-field">
          资产代码
          <input
            v-model="form.symbol"
            autocomplete="off"
            required
            placeholder="输入代码，例如 QQQ、600519"
            @focus="assetSearchFocused = true"
            @input="assetSearchFocused = true"
            @keydown.escape="assetSearchFocused = false"
          />
          <span v-if="assetSearchLoading" class="field-hint">正在联网搜索...</span>
          <div v-if="showAssetCandidates" class="asset-suggestions">
            <button
              v-for="candidate in assetCandidates"
              :key="`${candidate.market}:${candidate.symbol}:${candidate.currency}`"
              class="asset-suggestion"
              type="button"
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
            </button>
          </div>
        </label>
        <label>资产名称<input v-model="form.name" placeholder="股票可留空；基金建议选择名称" /></label>
        <label>市场<input :value="marketLabels[form.market]" disabled /></label>
        <label>币种<input :value="currencyLabels[form.currency]" disabled /></label>
        <label>数量/份额<input v-model.number="form.quantity" min="0" step="0.000001" type="number" /></label>
        <label v-if="form.assetType !== 'fund' && form.assetType !== 'cash'">
          成本价
          <input v-model.number="form.averageCost" min="0" step="0.000001" type="number" placeholder="可选" />
        </label>
        <label v-if="form.assetType === 'fund'">
          持有收益
          <input v-model.number="form.holdingProfit" step="0.01" type="number" placeholder="可填负数" />
        </label>
        <label v-if="form.assetType !== 'cash'">
          当前价格/净值
          <input v-model.number="form.currentPrice" min="0" step="0.000001" type="number" />
        </label>
      </div>
      <div class="form-actions">
        <button type="submit" :disabled="!canCreate">新增持仓</button>
        <span v-if="store.error" class="negative">{{ store.error }}</span>
      </div>
    </form>

    <article class="card">
      <table>
        <thead>
          <tr>
            <th>资产</th>
            <th>类型</th>
            <th>币种</th>
            <th>数量</th>
            <th>成本</th>
            <th>市值</th>
            <th>盈亏</th>
            <th>收益率</th>
            <th>价格状态</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="position in store.summary?.positions.filter(
              (item) => item.assetType === 'stock' || item.assetType === 'etf'
            )"
            :key="position.positionId"
          >
            <td>{{ position.assetName }} <span class="muted">{{ position.assetSymbol }}</span></td>
            <td><span class="tag">{{ assetTypeLabels[position.assetType] }}</span></td>
            <td>{{ currencyLabels[position.nativeCurrency] }}</td>
            <td>{{ position.quantity }}</td>
            <td>{{ position.averageCost > 0 ? formatCurrency(position.totalCost, position.nativeCurrency) : '未填写' }}</td>
            <td>{{ formatCurrency(position.marketValue, position.nativeCurrency) }}</td>
            <td :class="{ positive: (position.profitLoss ?? 0) >= 0, negative: (position.profitLoss ?? 0) < 0 }">
              {{ formatCurrency(position.profitLoss, position.nativeCurrency) }}
            </td>
            <td>{{ formatPercent(position.profitRate) }}</td>
            <td>
              <span class="tag" :class="`price-${position.priceStatus}`">
                {{ priceStatusLabels[position.priceStatus] }}
              </span>
            </td>
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
        <h3>删除持仓</h3>
        <p>确定要删除「{{ pendingRemoval.name }}」吗？这个操作会从当前持仓列表中移除它。</p>
        <div class="form-actions">
          <button class="secondary" type="button" @click="pendingRemoval = undefined">取消</button>
          <button class="danger" type="button" @click="confirmRemovePosition">确认删除</button>
        </div>
      </section>
    </div>
  </section>
</template>
