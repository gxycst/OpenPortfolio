import { describe, expect, it } from 'vitest'
import { normalizeTencentUsSymbol } from '@/providers/stocks/tencentStockSearchProvider'
import { searchAssetCandidatesOnline } from '@/services/assetSearchService'

describe('asset search ranking', () => {
  it('prefers online exact or prefix matches over built-in fallback items', async () => {
    const results = await searchAssetCandidatesOnline('51388', [], 5)
    const first = results[0]

    if (!first) {
      // Network data sources can be unavailable in CI-like environments.
      expect(results).toEqual([])
      return
    }

    expect(first.symbol).toContain('51388')
    expect(first.market).toBe('CN')
    expect(first.assetType).toBe('etf')
  }, 15000)
})

describe('Tencent US symbol normalization', () => {
  it('removes Tencent exchange suffixes while preserving class-share symbols', () => {
    expect(normalizeTencentUsSymbol('aapl.oq')).toBe('AAPL')
    expect(normalizeTencentUsSymbol('brk.b.n')).toBe('BRK.B')
    expect(normalizeTencentUsSymbol('brkc.am')).toBe('BRKC')
  })
})
