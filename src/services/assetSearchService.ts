import { builtInAssetCatalog, type AssetCandidate } from '@/providers/manualAssetCatalog'
import { searchOnlineAssets } from '@/providers/onlineAssetSearchProvider'
import type { Asset } from '@/types/domain'

export function searchAssetCandidates(query: string, existingAssets: Asset[], limit = 8): AssetCandidate[] {
  const normalizedQuery = query.trim().toUpperCase()
  if (!normalizedQuery) return []

  const localCandidates: AssetCandidate[] = existingAssets.map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    assetType: asset.assetType,
    market: asset.market,
    currency: asset.currency,
    source: 'local'
  }))

  const deduped = new Map<string, AssetCandidate>()
  for (const candidate of [...localCandidates, ...builtInAssetCatalog]) {
    const key = `${candidate.market}:${candidate.symbol}:${candidate.currency}`
    if (!matches(candidate, normalizedQuery) || deduped.has(key)) continue
    deduped.set(key, candidate)
  }

  return Array.from(deduped.values())
    .sort((a, b) => score(b, normalizedQuery) - score(a, normalizedQuery))
    .slice(0, limit)
}

export async function searchAssetCandidatesOnline(
  query: string,
  existingAssets: Asset[],
  limit = 10
): Promise<AssetCandidate[]> {
  const localResults = searchAssetCandidates(query, existingAssets, limit)
  const onlineResults = await searchOnlineAssets(query).catch(() => [])
  const deduped = new Map<string, AssetCandidate>()

  for (const candidate of [...localResults, ...onlineResults]) {
    const key = `${candidate.market}:${candidate.symbol}:${candidate.currency}`
    if (!deduped.has(key)) deduped.set(key, candidate)
  }

  return Array.from(deduped.values()).slice(0, limit)
}

function matches(candidate: AssetCandidate, query: string): boolean {
  return candidate.symbol.toUpperCase().includes(query) || candidate.name.toUpperCase().includes(query)
}

function score(candidate: AssetCandidate, query: string): number {
  const symbol = candidate.symbol.toUpperCase()
  if (symbol === query) return 4
  if (symbol.startsWith(query)) return 3
  if (candidate.source === 'local') return 2
  return 1
}
