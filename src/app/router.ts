import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardPage from '@/pages/DashboardPage.vue'
import AccountsPage from '@/pages/AccountsPage.vue'
import CashPage from '@/pages/CashPage.vue'
import FundsPage from '@/pages/FundsPage.vue'
import PositionsPage from '@/pages/PositionsPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardPage },
    { path: '/accounts', name: 'accounts', component: AccountsPage },
    { path: '/positions', name: 'positions', component: PositionsPage },
    { path: '/funds', name: 'funds', component: FundsPage },
    { path: '/cash', name: 'cash', component: CashPage }
  ]
})
