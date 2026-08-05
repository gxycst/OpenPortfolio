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
            <RouterView />
          </main>
        </div>
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import type { GlobalThemeOverrides } from 'naive-ui'
import { dateZhCN, NConfigProvider, NDialogProvider, NMessageProvider, zhCN } from 'naive-ui'
import { Banknote, BriefcaseBusiness, ChartCandlestick, House, Landmark, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { ref } from 'vue'

const sidebarCollapsed = ref(false)
const navItems = [
  { to: '/', label: '首页', icon: House },
  { to: '/accounts', label: '账户', icon: BriefcaseBusiness },
  { to: '/positions', label: '股票', icon: ChartCandlestick },
  { to: '/funds', label: '基金', icon: Landmark },
  { to: '/cash', label: '现金', icon: Banknote }
]

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#059669',
    primaryColorHover: '#047857',
    primaryColorPressed: '#065f46',
    primaryColorSuppl: '#10b981'
  }
}
</script>
