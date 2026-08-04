export interface FundNavQuote {
  fundCode: string
  name: string
  nav: number
  navDate: string
  providerId: 'eastmoney_fundgz'
  fetchedAt: string
}

interface EastmoneyFundGzPayload {
  fundcode?: string
  name?: string
  dwjz?: string
  jzrq?: string
}

export async function fetchLatestFundNav(fundCode: string): Promise<FundNavQuote> {
  const code = fundCode.trim()
  if (!code) throw new Error('基金代码不能为空')
  const payload = await loadFundNavViaScript(code)
  const nav = Number(payload.dwjz)
  if (!payload.fundcode || !Number.isFinite(nav) || nav <= 0 || !payload.jzrq) {
    throw new Error('基金净值响应格式不正确')
  }
  return {
    fundCode: payload.fundcode,
    name: payload.name ?? payload.fundcode,
    nav,
    navDate: payload.jzrq,
    providerId: 'eastmoney_fundgz',
    fetchedAt: new Date().toISOString()
  }
}

function loadFundNavViaScript(fundCode: string): Promise<EastmoneyFundGzPayload> {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonpgz'
    const script = document.createElement('script')
    const host = globalThis as typeof globalThis & Record<string, unknown>
    const previousCallback = host[callbackName]
    const cleanup = () => {
      if (previousCallback) {
        host[callbackName] = previousCallback
      } else {
        delete host[callbackName]
      }
      script.remove()
    }

    ;(host as typeof host & Record<string, (payload: EastmoneyFundGzPayload) => void>)[callbackName] = (payload) => {
      cleanup()
      resolve(payload)
    }

    script.src = `https://fundgz.1234567.com.cn/js/${encodeURIComponent(fundCode)}.js?rt=${Date.now()}`
    script.async = true
    script.onerror = () => {
      cleanup()
      reject(new Error('基金净值获取失败'))
    }
    document.head.appendChild(script)
  })
}
