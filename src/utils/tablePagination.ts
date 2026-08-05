import type { PaginationProps } from 'naive-ui'
import type { Ref } from 'vue'

export function createTablePagination(page: Ref<number>, pageSize: Ref<number>): PaginationProps {
  return {
    page: page.value,
    pageSize: pageSize.value,
    pageSizes: [
      { label: '10 条/页', value: 10 },
      { label: '20 条/页', value: 20 },
      { label: '50 条/页', value: 50 }
    ],
    showSizePicker: true,
    onUpdatePage: (nextPage) => {
      page.value = nextPage
    },
    onUpdatePageSize: (nextPageSize) => {
      pageSize.value = nextPageSize
      page.value = 1
    }
  }
}

export function pageAfterRemoval(currentPage: number, pageSize: number, remainingCount: number): number {
  return Math.min(currentPage, Math.max(1, Math.ceil(remainingCount / pageSize)))
}
