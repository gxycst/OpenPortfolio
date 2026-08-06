export interface FundNavQuote {
  fundCode: string
  name: string
  nav: number
  navDate: string
  providerId: 'eastmoney_fund_mobile' | 'eastmoney_pingzhongdata'
  fetchedAt: string
}

interface EastmoneyMobileFundPayload {
  FCODE?: string
  SHORTNAME?: string
  NAV?: string
  PDATE?: string
}

interface EastmoneyMobileFundResponse {
  Datas?: EastmoneyMobileFundPayload[]
  ErrCode?: number | string
  Success?: boolean
  ErrMsg?: string | null
  ErrorMessage?: string | null
}

interface EastmoneyPingzhongPayload {
  fundCode: string
  name: string
  nav: number
  navDate: string
}

export async function fetchLatestFundNav(fundCode: string): Promise<FundNavQuote> {
  const code = fundCode.trim()
  if (!code) throw new Error('基金代码不能为空')

  try {
    const payload = await loadFundNav(code)
    const nav = Number(payload.NAV)
    if (!payload.FCODE || !Number.isFinite(nav) || nav <= 0 || !payload.PDATE) {
      throw new Error('基金净值响应格式不正确')
    }
    return {
      fundCode: payload.FCODE,
      name: payload.SHORTNAME ?? payload.FCODE,
      nav,
      navDate: payload.PDATE,
      providerId: 'eastmoney_fund_mobile',
      fetchedAt: new Date().toISOString()
    }
  } catch {
    const payload = await loadFundNavFromPingzhongdata(code)
    return {
      fundCode: payload.fundCode,
      name: payload.name,
      nav: payload.nav,
      navDate: payload.navDate,
      providerId: 'eastmoney_pingzhongdata',
      fetchedAt: new Date().toISOString()
    }
  }
}

async function loadFundNav(fundCode: string): Promise<EastmoneyMobileFundPayload> {
  try {
    const response = await fetch(buildFundNavUrl(fundCode))
    if (!response.ok) throw new Error('基金净值获取失败')
    return pickFundNavPayload((await response.json()) as EastmoneyMobileFundResponse)
  } catch {
    return loadFundNavViaScript(fundCode)
  }
}

function loadFundNavViaScript(fundCode: string): Promise<EastmoneyMobileFundPayload> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('基金净值脚本获取不可用'))
      return
    }
    const callbackName = `eastmoneyFundNav_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const host = globalThis as typeof globalThis & Record<string, unknown>
    const cleanup = () => {
      delete host[callbackName]
      script.remove()
    }

    ;(host as typeof host & Record<string, (response: EastmoneyMobileFundResponse) => void>)[callbackName] = (response) => {
      try {
        resolve(pickFundNavPayload(response))
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }

    script.src = buildFundNavUrl(fundCode, callbackName)
    script.async = true
    script.onerror = () => {
      cleanup()
      reject(new Error('基金净值获取失败'))
    }
    document.head.appendChild(script)
  })
}

async function loadFundNavFromPingzhongdata(fundCode: string): Promise<EastmoneyPingzhongPayload> {
  try {
    const response = await fetch(buildPingzhongdataUrl(fundCode))
    if (!response.ok) throw new Error('基金净值获取失败')
    return parsePingzhongdataScript(await response.text())
  } catch {
    return loadPingzhongdataViaScript(fundCode)
  }
}

function loadPingzhongdataViaScript(fundCode: string): Promise<EastmoneyPingzhongPayload> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('基金净值获取失败'))
      return
    }
    const host = globalThis as typeof globalThis & {
      fS_code?: string
      fS_name?: string
      Data_netWorthTrend?: Array<{ x?: number; y?: number }>
    }
    const previous = {
      fS_code: host.fS_code,
      fS_name: host.fS_name,
      Data_netWorthTrend: host.Data_netWorthTrend
    }
    const script = document.createElement('script')
    const cleanup = () => {
      if (previous.fS_code === undefined) delete host.fS_code
      else host.fS_code = previous.fS_code
      if (previous.fS_name === undefined) delete host.fS_name
      else host.fS_name = previous.fS_name
      if (previous.Data_netWorthTrend === undefined) delete host.Data_netWorthTrend
      else host.Data_netWorthTrend = previous.Data_netWorthTrend
      script.remove()
    }

    script.onload = () => {
      try {
        const trend = host.Data_netWorthTrend ?? []
        const latest = trend[trend.length - 1]
        const nav = Number(latest?.y)
        if (!host.fS_code || !Number.isFinite(nav) || nav <= 0 || !latest?.x) {
          throw new Error('基金净值响应格式不正确')
        }
        resolve({
          fundCode: host.fS_code,
          name: host.fS_name ?? host.fS_code,
          nav,
          navDate: formatEastmoneyTimestamp(latest.x)
        })
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }
    script.onerror = () => {
      cleanup()
      reject(new Error('基金净值获取失败'))
    }
    script.src = buildPingzhongdataUrl(fundCode)
    script.async = true
    document.head.appendChild(script)
  })
}

function buildFundNavUrl(fundCode: string, callbackName?: string): string {
  const url = new URL('https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo')
  url.searchParams.set('pageIndex', '1')
  url.searchParams.set('pageSize', '20')
  url.searchParams.set('plat', 'Android')
  url.searchParams.set('appType', 'ttjj')
  url.searchParams.set('product', 'EFund')
  url.searchParams.set('Version', '1')
  url.searchParams.set('deviceid', 'openportfolio')
  url.searchParams.set('Fcodes', fundCode)
  if (callbackName) url.searchParams.set('callback', callbackName)
  return url.toString()
}

function buildPingzhongdataUrl(fundCode: string): string {
  return `https://fund.eastmoney.com/pingzhongdata/${encodeURIComponent(fundCode)}.js?v=${Date.now()}`
}

function pickFundNavPayload(response: EastmoneyMobileFundResponse): EastmoneyMobileFundPayload {
  if (response.Success === false || String(response.ErrCode) !== '0') {
    throw new Error(response.ErrMsg || response.ErrorMessage || '基金净值获取失败')
  }
  const payload = response.Datas?.[0]
  if (!payload) throw new Error('未查询到基金净值')
  return payload
}

function parsePingzhongdataScript(scriptText: string): EastmoneyPingzhongPayload {
  const fundCode = scriptText.match(/var\s+fS_code\s*=\s*"([^"]+)"/)?.[1]
  const name = scriptText.match(/var\s+fS_name\s*=\s*"([^"]+)"/)?.[1]
  const trendText = scriptText.match(/Data_netWorthTrend\s*=\s*\[([\s\S]*?)\];/)?.[1]
  const rows = [...(trendText ?? '').matchAll(/\{[^}]*x\s*:\s*(\d+)[^}]*y\s*:\s*(-?\d+(?:\.\d+)?)/g)]
  const latest = rows[rows.length - 1]
  const nav = Number(latest?.[2])
  const timestamp = Number(latest?.[1])
  if (!fundCode || !Number.isFinite(nav) || nav <= 0 || !Number.isFinite(timestamp)) {
    throw new Error('基金净值响应格式不正确')
  }
  return {
    fundCode,
    name: name ?? fundCode,
    nav,
    navDate: formatEastmoneyTimestamp(timestamp)
  }
}

function formatEastmoneyTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}
