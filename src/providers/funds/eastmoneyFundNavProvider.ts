export interface FundNavQuote {
  fundCode: string
  name: string
  nav: number
  navDate: string
  providerId: 'eastmoney_fund_mobile'
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

export async function fetchLatestFundNav(fundCode: string): Promise<FundNavQuote> {
  const code = fundCode.trim()
  if (!code) throw new Error('基金代码不能为空')

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

function pickFundNavPayload(response: EastmoneyMobileFundResponse): EastmoneyMobileFundPayload {
  if (response.Success === false || String(response.ErrCode) !== '0') {
    throw new Error(response.ErrMsg || response.ErrorMessage || '基金净值获取失败')
  }
  const payload = response.Datas?.[0]
  if (!payload) throw new Error('未查询到基金净值')
  return payload
}
