<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NDialogProvider>
      <NMessageProvider>
        <div class="shell">
          <aside class="sidebar">
            <div>
              <p class="eyebrow">有数资产</p>
            </div>
            <nav class="nav">
              <RouterLink to="/">首页</RouterLink>
              <RouterLink to="/accounts">账户</RouterLink>
              <RouterLink to="/positions">股票</RouterLink>
              <RouterLink to="/funds">基金</RouterLink>
              <RouterLink to="/cash">现金</RouterLink>
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
import { NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#059669',
    primaryColorHover: '#047857',
    primaryColorPressed: '#065f46',
    primaryColorSuppl: '#10b981'
  }
}
</script>
