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
                <NButton size="small" type="primary" @click="exportData">导出</NButton>
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
