<template>
  <NConfigProvider :date-locale="dateZhCN" :locale="zhCN" :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NMessageProvider>
        <div class="shell" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
          <aside class="sidebar">
            <div class="sidebar-header">
              <p class="eyebrow">有数资产</p>
              <button
                class="sidebar-toggle"
                type="button"
                :aria-label="sidebarCollapsed ? '展开菜单' : '收起菜单'"
                @click="sidebarCollapsed = !sidebarCollapsed"
              >
                <PanelLeftClose v-if="!sidebarCollapsed" :size="18" />
                <PanelLeftOpen v-else :size="18" />
              </button>
            </div>
            <nav class="nav">
              <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" :aria-label="item.label">
                <component :is="item.icon" :size="18" />
                <span class="nav-label">{{ item.label }}</span>
                <span class="nav-tooltip">{{ item.label }}</span>
              </RouterLink>
            </nav>
          </aside>
          <main class="content">
            <header class="topbar">
              <div class="breadcrumb">
                <span class="breadcrumb-root">有数资产</span>
                <span class="breadcrumb-separator">/</span>
                <strong>{{ currentPageLabel }}</strong>
              </div>
              <div class="topbar-actions">
                <NButton size="small" secondary @click="showImportModal = true">导入</NButton>
                <NButton size="small" secondary @click="exportData">导出</NButton>
                <NButton size="small" secondary @click="showHelpModal = true">帮助</NButton>
              </div>
            </header>
            <RouterView />
          </main>
        </div>

        <NModal v-model:show="showImportModal" preset="card" title="导入备份" class="account-create-modal">
          <div class="backup-panel">
            <p class="modal-copy">导入备份会恢复备份文件中的本地数据。建议导入前先导出当前数据，避免误覆盖。</p>
            <div class="backup-actions">
              <NButton size="small" secondary @click="showImportModal = false">取消</NButton>
              <NButton size="small" type="primary" @click="backupInputRef?.click()">选择文件导入</NButton>
              <input ref="backupInputRef" class="hidden-file-input" type="file" accept="application/json,.json" @change="importData" />
            </div>
            <p v-if="backupStatus" class="backup-status" :class="{ negative: backupStatusType === 'error' }">
              {{ backupStatus }}
            </p>
          </div>
        </NModal>

        <NModal v-model:show="showHelpModal" preset="card" title="帮助" class="help-modal">
          <div class="help-content">
            <section>
              <h3>谁可能需要？</h3>
              <p>有些特殊情况，人们不得不开理财超市，以求得阶段性的投资最优解。一个人可能同时持有美股、A 股、港股、美基、港基、人民币基金等各类投资组合。</p>
              <p>这些资产分散各处，统计它们再进行汇率换算，并非易事。本站便因此而生：聚合全球性资产，一目了然，心中有数。</p>
            </section>

            <section>
              <h3>如何使用？</h3>
              <p>初次进入时，系统会展示模拟数据，你可以一键清空，并正式开始。</p>
              <p>先创建账户，起一个熟悉的名字，选择资产和币种类别。</p>
              <p>再去左侧资产类别目录，分别录入资产。</p>
              <p>拥有资产后，首页会对资产情况进行汇总。</p>
              <p>本系统数据 100% 本地化。如果更换设备或浏览器使用，需要先导出数据，再在新设备导入。</p>
            </section>

            <section>
              <h3>竞品分析</h3>
              <p>已有不少成熟的软件，比如《同花顺投资账本》，可以解决大部分问题，但仅限于人民币币种。</p>
              <p>雪球模拟仓里可以同时录入美股、A 股、港股数据，可实现汇率自动转换，但也仅限于转换人民币，且无法汇总基金。</p>
              <p>本系统是对它们长处的整合，外加多种汇率转换。</p>
            </section>

            <section>
              <h3>不足之处</h3>
              <p>本系统主要为记账设计，不涉及股票买卖点、基金定投记录、收益统计。</p>
              <p>它最适合长线低频交易投资者，在完成阶段性布局之后，对总资产或局部资产进行整体化把控。不求最精确，但求心中有数。</p>
              <p>这是完全 AI 生成的产品，如果 token 用光且本人破产，则无力继续开发维护。</p>
              <p>一切接口均为免费接口，代码开源，你可随意更改下载，不涉及任何版权问题。</p>
              <p class="help-note">
                需要提醒的是，由于免费接口的缘故，本系统的股票精度目前只能做到 3 位数，导致统计时，股票持仓的收益金额稍微有些出入，但收益率的计算没有问题。
              </p>
              <p>如果你有更完美的替代方案，我也非常乐意使用。</p>
            </section>
          </div>
        </NModal>
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import type { GlobalThemeOverrides } from 'naive-ui'
import { dateZhCN, NButton, NConfigProvider, NDialogProvider, NMessageProvider, NModal, zhCN } from 'naive-ui'
import { Banknote, BriefcaseBusiness, ChartCandlestick, House, Landmark, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePortfolioStore } from '@/stores/portfolioStore'

const sidebarCollapsed = ref(false)
const showImportModal = ref(false)
const showHelpModal = ref(false)
const backupInputRef = ref<HTMLInputElement | null>(null)
const backupStatus = ref('')
const backupStatusType = ref<'success' | 'error'>('success')
const route = useRoute()
const store = usePortfolioStore()
const navItems = [
  { to: '/', label: '首页', icon: House },
  { to: '/accounts', label: '账户', icon: BriefcaseBusiness },
  { to: '/positions', label: '股票', icon: ChartCandlestick },
  { to: '/funds', label: '基金', icon: Landmark },
  { to: '/cash', label: '现金', icon: Banknote }
]
const currentPageLabel = computed(() => navItems.find((item) => item.to === route.path)?.label ?? '首页')

async function exportData() {
  const backup = await store.exportBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `openportfolio-backup-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  backupStatusType.value = 'success'
  backupStatus.value = '备份文件已导出'
}

async function importData(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const backup = JSON.parse(await file.text()) as unknown
    await store.importBackup(backup)
    backupStatusType.value = 'success'
    backupStatus.value = '备份已导入，当前本地数据已恢复'
    showImportModal.value = false
  } catch (error) {
    backupStatusType.value = 'error'
    backupStatus.value = error instanceof Error ? error.message : '备份导入失败'
  }
}

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#059669',
    primaryColorHover: '#047857',
    primaryColorPressed: '#065f46',
    primaryColorSuppl: '#10b981'
  }
}
</script>
