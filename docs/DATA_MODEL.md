# OpenPortfolio 数据模型设计

**文档版本：** V0.1
**对应 PRD：** V0.1
**对应架构：** ARCHITECTURE V0.1
**存储方案：** IndexedDB + Dexie.js
**当前范围：** Web MVP

---

## 一、设计目标

本数据模型用于支持 OpenPortfolio 第一阶段的核心功能：

* 管理多个投资账户
* 记录 A 股持仓
* 记录美股持仓
* 记录场外基金持仓
* 记录人民币和美元现金
* 保存股票价格和基金净值
* 保存人民币与美元汇率
* 计算人民币和美元口径的总资产
* 保存每日资产快照
* 支持完整备份与恢复
* 支持后续数据库版本迁移

数据模型应满足以下原则：

1. 原始数据与计算结果分离。
2. 当前持仓与历史快照分离。
3. 账户与资产分离。
4. 自动价格与手动价格统一管理。
5. 数据源可以替换。
6. 不依赖某一家券商的数据结构。
7. 不依赖某一个国家或币种。
8. 后续能够扩展更多资产类型。

---

## 二、核心概念

OpenPortfolio 的核心数据关系如下：

```text
账户 Account
    │
    └── 持仓 Position
            │
            └── 资产 Asset
                    │
                    └── 价格 Price
```

汇率单独保存：

```text
汇率 ExchangeRate
```

每日资产状态保存为：

```text
资产快照 PortfolioSnapshot
```

应用配置保存为：

```text
应用设置 AppSetting
```

---

## 三、为什么账户、资产和持仓要分开

### 3.1 账户不是资产

“嘉信理财”是账户，不是资产。

“QQQ”是资产，不是账户。

用户可能同时在两个账户中持有 QQQ，因此不能把账户信息直接写入资产表。

### 3.2 持仓表示账户与资产的关系

例如：

```text
账户：嘉信理财
资产：QQQ
数量：100
平均成本：450 美元
```

这一条记录属于 Position。

如果另一个账户也持有 QQQ，则创建另一条 Position。

### 3.3 价格属于资产

QQQ 的市场价格原则上与用户在哪个账户持有无关。

因此价格应关联 Asset，而不是直接关联 Position。

手动价格是一个例外场景，但仍建议统一保存在 Price 表中，并通过来源和模式进行区分。

---

## 四、数据库表总览

MVP 第一版包含以下数据表：

```text
accounts
assets
positions
prices
exchangeRates
portfolioSnapshots
appSettings
metadata
```

可选的后续数据表：

```text
transactions
dividends
fees
taxes
providerLogs
backupRecords
assetAliases
```

后续表不属于当前 MVP。

---

# 五、Account 账户表

## 5.1 用途

记录资产所在的逻辑账户。

账户可以代表：

* 国内券商账户
* 美国券商账户
* 基金销售平台
* 银行账户
* 现金账户
* 用户自定义账户

## 5.2 TypeScript 类型

```ts
export type AccountType =
  | 'china_broker'
  | 'us_broker'
  | 'fund_platform'
  | 'bank'
  | 'cash'
  | 'other'

export interface Account {
  id: string
  name: string
  type: AccountType
  institution?: string
  defaultCurrency: CurrencyCode
  market?: MarketCode
  note?: string
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
```

## 5.3 字段说明

| 字段              | 类型           | 必填 | 说明        |
| --------------- | ------------ | -: | --------- |
| id              | string       |  是 | 全局唯一标识    |
| name            | string       |  是 | 用户自定义账户名称 |
| type            | AccountType  |  是 | 账户类型      |
| institution     | string       |  否 | 机构名称      |
| defaultCurrency | CurrencyCode |  是 | 默认币种      |
| market          | MarketCode   |  否 | 账户主要市场    |
| note            | string       |  否 | 用户备注      |
| isArchived      | boolean      |  是 | 是否归档      |
| sortOrder       | number       |  是 | 展示顺序      |
| createdAt       | string       |  是 | 创建时间      |
| updatedAt       | string       |  是 | 更新时间      |

## 5.4 示例

```json
{
  "id": "acc_schwab",
  "name": "嘉信理财",
  "type": "us_broker",
  "institution": "Charles Schwab",
  "defaultCurrency": "USD",
  "market": "US",
  "isArchived": false,
  "sortOrder": 1,
  "createdAt": "2026-08-04T10:00:00.000Z",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

## 5.5 删除规则

账户默认不直接物理删除。

当账户存在持仓时：

* 优先设置为归档。
* 不在默认账户列表中展示。
* 历史快照和关联数据继续保留。

只有账户没有任何关联持仓时，才允许彻底删除。

---

# 六、Asset 资产表

## 6.1 用途

记录资产本身的基础信息。

资产包括：

* A 股股票
* 美股股票
* ETF
* 场外基金
* 现金
* 其他资产

## 6.2 资产类型

```ts
export type AssetType =
  | 'stock'
  | 'etf'
  | 'fund'
  | 'cash'
  | 'bond'
  | 'commodity'
  | 'crypto'
  | 'other'
```

MVP 主要使用：

```text
stock
etf
fund
cash
other
```

## 6.3 市场类型

```ts
export type MarketCode =
  | 'CN'
  | 'US'
  | 'HK'
  | 'JP'
  | 'EU'
  | 'FUND_CN'
  | 'CASH'
  | 'OTHER'
```

MVP 主要使用：

```text
CN
US
FUND_CN
CASH
```

## 6.4 币种类型

```ts
export type CurrencyCode =
  | 'CNY'
  | 'USD'
  | 'HKD'
  | 'JPY'
  | 'EUR'
  | 'GBP'
  | 'OTHER'
```

MVP 主要支持：

```text
CNY
USD
```

## 6.5 TypeScript 类型

```ts
export interface Asset {
  id: string
  symbol: string
  name: string
  assetType: AssetType
  market: MarketCode
  currency: CurrencyCode
  exchange?: string
  isin?: string
  fundShareClass?: string
  providerSymbols?: Record<string, string>
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

## 6.6 字段说明

| 字段              | 类型           | 必填 | 说明             |
| --------------- | ------------ | -: | -------------- |
| id              | string       |  是 | 资产唯一标识         |
| symbol          | string       |  是 | 股票代码、基金代码或内部代码 |
| name            | string       |  是 | 资产名称           |
| assetType       | AssetType    |  是 | 资产类型           |
| market          | MarketCode   |  是 | 所属市场           |
| currency        | CurrencyCode |  是 | 计价币种           |
| exchange        | string       |  否 | 交易所            |
| isin            | string       |  否 | 国际证券识别码        |
| fundShareClass  | string       |  否 | 基金份额类别         |
| providerSymbols | object       |  否 | 各数据源对应代码       |
| isActive        | boolean      |  是 | 是否仍在使用         |
| createdAt       | string       |  是 | 创建时间           |
| updatedAt       | string       |  是 | 更新时间           |

## 6.7 资产唯一性

资产不能只使用 symbol 判断唯一。

例如：

```text
代码相同但市场不同
代码相同但币种不同
基金人民币份额与美元份额代码接近
```

建议资产唯一键逻辑为：

```text
market + symbol + currency
```

对于基金份额，还需要考虑：

```text
fundShareClass
```

建议最终逻辑唯一键：

```text
market + symbol + currency + fundShareClass
```

数据库中仍使用 `id` 作为主键。

## 6.8 示例：美股 ETF

```json
{
  "id": "asset_us_qqq_usd",
  "symbol": "QQQ",
  "name": "Invesco QQQ Trust",
  "assetType": "etf",
  "market": "US",
  "currency": "USD",
  "exchange": "NASDAQ",
  "isActive": true,
  "createdAt": "2026-08-04T10:00:00.000Z",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

## 6.9 示例：人民币基金份额

```json
{
  "id": "asset_fund_000001_cny",
  "symbol": "000001",
  "name": "示例基金人民币份额",
  "assetType": "fund",
  "market": "FUND_CN",
  "currency": "CNY",
  "fundShareClass": "CNY",
  "isActive": true,
  "createdAt": "2026-08-04T10:00:00.000Z",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

## 6.10 示例：美元基金份额

```json
{
  "id": "asset_fund_000001_usd",
  "symbol": "000001-USD",
  "name": "示例基金美元份额",
  "assetType": "fund",
  "market": "FUND_CN",
  "currency": "USD",
  "fundShareClass": "USD",
  "isActive": true,
  "createdAt": "2026-08-04T10:00:00.000Z",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

---

# 七、Position 持仓表

## 7.1 用途

记录某个账户持有某项资产的当前状态。

MVP 不记录每笔买入和卖出交易。

因此 Position 保存的是当前汇总结果：

* 当前数量
* 当前平均成本
* 当前持仓状态

未来增加交易流水后，可以通过交易记录重新计算 Position。

## 7.2 TypeScript 类型

```ts
export type PriceMode = 'auto' | 'manual'

export interface Position {
  id: string
  accountId: string
  assetId: string
  quantity: number
  averageCost: number
  costCurrency: CurrencyCode
  priceMode: PriceMode
  manualPrice?: number
  manualPriceDate?: string
  openedAt?: string
  note?: string
  isClosed: boolean
  createdAt: string
  updatedAt: string
}
```

## 7.3 字段说明

| 字段              | 类型           | 必填 | 说明        |
| --------------- | ------------ | -: | --------- |
| id              | string       |  是 | 持仓唯一标识    |
| accountId       | string       |  是 | 所属账户      |
| assetId         | string       |  是 | 对应资产      |
| quantity        | number       |  是 | 数量或基金份额   |
| averageCost     | number       |  是 | 平均成本单价    |
| costCurrency    | CurrencyCode |  是 | 成本币种      |
| priceMode       | PriceMode    |  是 | 自动或手动价格模式 |
| manualPrice     | number       |  否 | 手动价格      |
| manualPriceDate | string       |  否 | 手动价格日期    |
| openedAt        | string       |  否 | 初始持仓日期    |
| note            | string       |  否 | 用户备注      |
| isClosed        | boolean      |  是 | 是否已清仓     |
| createdAt       | string       |  是 | 创建时间      |
| updatedAt       | string       |  是 | 更新时间      |

## 7.4 持仓唯一性

MVP 默认规则：

```text
同一账户 + 同一资产 = 一条当前持仓
```

逻辑唯一键：

```text
accountId + assetId
```

如果用户再次录入相同账户和资产，应进入编辑或合并流程，而不是直接创建重复记录。

## 7.5 数量规则

* 股票数量可以是整数或小数。
* 美股可能存在碎股，因此不能限定为整数。
* 基金份额通常允许小数。
* 现金数量直接表示金额。
* 数量不得为负数。
* 当前持仓数量为零时，可以标记为已清仓。

## 7.6 成本规则

`averageCost` 表示单份或单股平均成本。

MVP 中由用户直接输入。

例如：

```text
QQQ 数量：100
平均成本：450 USD
总成本：45,000 USD
```

系统不要求用户录入每笔交易。

## 7.7 现金持仓

现金也可以作为一种 Asset 和 Position。

例如：

```text
Asset:
  symbol: CASH_USD
  assetType: cash
  currency: USD

Position:
  quantity: 25000
  averageCost: 1
```

现金计算规则：

```text
市值 = quantity
```

对于现金资产，不使用普通股票价格。

也可以将现金价格固定为 1。

## 7.8 示例

```json
{
  "id": "pos_schwab_qqq",
  "accountId": "acc_schwab",
  "assetId": "asset_us_qqq_usd",
  "quantity": 100,
  "averageCost": 450,
  "costCurrency": "USD",
  "priceMode": "auto",
  "isClosed": false,
  "createdAt": "2026-08-04T10:00:00.000Z",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

---

# 八、Price 价格表

## 8.1 用途

保存资产价格、基金净值以及手动价格。

价格表不仅保存“现在的价格”，还需要保存：

* 数据来源
* 价格时间
* 获取时间
* 是否延迟
* 是否有效
* 错误状态

## 8.2 价格类型

```ts
export type PriceType =
  | 'market'
  | 'nav'
  | 'manual'
  | 'fixed'
```

含义：

* `market`：股票或 ETF 行情
* `nav`：基金净值
* `manual`：用户手动价格
* `fixed`：固定价格，例如现金价格 1

## 8.3 TypeScript 类型

```ts
export type PriceStatus =
  | 'valid'
  | 'stale'
  | 'error'

export interface Price {
  id: string
  assetId: string
  price: number
  currency: CurrencyCode
  priceType: PriceType
  providerId: string
  priceDate: string
  fetchedAt: string
  delayed: boolean
  status: PriceStatus
  errorCode?: string
  createdAt: string
  updatedAt: string
}
```

## 8.4 字段说明

| 字段         | 类型           | 必填 | 说明        |
| ---------- | ------------ | -: | --------- |
| id         | string       |  是 | 价格记录唯一标识  |
| assetId    | string       |  是 | 对应资产      |
| price      | number       |  是 | 当前价格或净值   |
| currency   | CurrencyCode |  是 | 价格币种      |
| priceType  | PriceType    |  是 | 价格类型      |
| providerId | string       |  是 | 数据来源      |
| priceDate  | string       |  是 | 行情时间或净值日期 |
| fetchedAt  | string       |  是 | 实际获取时间    |
| delayed    | boolean      |  是 | 是否延迟行情    |
| status     | PriceStatus  |  是 | 数据状态      |
| errorCode  | string       |  否 | 最近错误代码    |
| createdAt  | string       |  是 | 创建时间      |
| updatedAt  | string       |  是 | 更新时间      |

## 8.5 当前价格与价格历史

MVP 第一阶段只要求保存每项资产最近一次有效价格。

建议每个资产只保留一条“当前价格记录”。

逻辑唯一键：

```text
assetId
```

后续如果需要价格历史，应新增：

```text
priceHistory
```

不要直接让当前 Price 表无限增长。

## 8.6 手动价格选择逻辑

获取持仓有效价格时：

```text
如果 Position.priceMode = manual
    使用 Position.manualPrice

否则
    使用 Price 表中 assetId 对应的自动价格
```

如果手动模式下没有 manualPrice，则持仓应显示“缺少价格”。

## 8.7 价格币种校验

正常情况下：

```text
Price.currency = Asset.currency
```

如果第三方数据源返回其他币种，Provider 层应先转换或拒绝，而不是直接写入。

## 8.8 示例：股票价格

```json
{
  "id": "price_asset_us_qqq_usd",
  "assetId": "asset_us_qqq_usd",
  "price": 550.25,
  "currency": "USD",
  "priceType": "market",
  "providerId": "example_us_provider",
  "priceDate": "2026-08-04T16:00:00-04:00",
  "fetchedAt": "2026-08-04T20:05:00.000Z",
  "delayed": true,
  "status": "valid",
  "createdAt": "2026-08-04T20:05:00.000Z",
  "updatedAt": "2026-08-04T20:05:00.000Z"
}
```

## 8.9 示例：基金净值

```json
{
  "id": "price_asset_fund_000001_cny",
  "assetId": "asset_fund_000001_cny",
  "price": 2.1357,
  "currency": "CNY",
  "priceType": "nav",
  "providerId": "manual",
  "priceDate": "2026-08-04",
  "fetchedAt": "2026-08-04T22:30:00.000Z",
  "delayed": false,
  "status": "valid",
  "createdAt": "2026-08-04T22:30:00.000Z",
  "updatedAt": "2026-08-04T22:30:00.000Z"
}
```

---

# 九、ExchangeRate 汇率表

## 9.1 用途

保存不同币种之间的换算关系。

MVP 至少支持：

```text
USD/CNY
```

系统可以根据该汇率推导：

```text
CNY/USD
```

## 9.2 TypeScript 类型

```ts
export type ExchangeRateStatus =
  | 'valid'
  | 'stale'
  | 'error'

export interface ExchangeRate {
  id: string
  baseCurrency: CurrencyCode
  quoteCurrency: CurrencyCode
  rate: number
  providerId: string
  rateDate: string
  fetchedAt: string
  status: ExchangeRateStatus
  errorCode?: string
  createdAt: string
  updatedAt: string
}
```

## 9.3 字段说明

| 字段            | 类型                 | 必填 | 说明       |
| ------------- | ------------------ | -: | -------- |
| id            | string             |  是 | 汇率记录唯一标识 |
| baseCurrency  | CurrencyCode       |  是 | 基础币种     |
| quoteCurrency | CurrencyCode       |  是 | 目标币种     |
| rate          | number             |  是 | 兑换比例     |
| providerId    | string             |  是 | 数据来源     |
| rateDate      | string             |  是 | 汇率日期     |
| fetchedAt     | string             |  是 | 获取时间     |
| status        | ExchangeRateStatus |  是 | 当前状态     |
| errorCode     | string             |  否 | 错误代码     |
| createdAt     | string             |  是 | 创建时间     |
| updatedAt     | string             |  是 | 更新时间     |

## 9.4 汇率含义

如果记录为：

```text
baseCurrency: USD
quoteCurrency: CNY
rate: 7.20
```

表示：

```text
1 USD = 7.20 CNY
```

## 9.5 唯一性

逻辑唯一键：

```text
baseCurrency + quoteCurrency
```

例如：

```text
USD_CNY
```

## 9.6 反向汇率

不强制同时保存：

```text
USD/CNY
CNY/USD
```

可以保存主汇率后计算反向值：

```text
CNY/USD = 1 ÷ USD/CNY
```

避免两个方向的数据不同步。

## 9.7 示例

```json
{
  "id": "fx_usd_cny",
  "baseCurrency": "USD",
  "quoteCurrency": "CNY",
  "rate": 7.2,
  "providerId": "manual",
  "rateDate": "2026-08-04",
  "fetchedAt": "2026-08-04T10:00:00.000Z",
  "status": "valid",
  "createdAt": "2026-08-04T10:00:00.000Z",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

---

# 十、PortfolioSnapshot 资产快照表

## 10.1 用途

保存某一天投资组合的汇总结果。

快照用于未来展示：

* 总资产走势图
* 人民币总资产变化
* 美元总资产变化
* 账户占比变化
* 币种占比变化
* 资产类型变化

## 10.2 快照不是交易记录

快照只表示某一时刻的资产状态。

它不能用于精确还原：

* 买卖操作
* 分红
* 手续费
* 税费
* 资金转入转出

未来若需要精确收益分析，需要增加 Transaction 表。

## 10.3 TypeScript 类型

```ts
export interface SnapshotBreakdownItem {
  key: string
  name: string
  valueCNY: number
  valueUSD: number
  percentage: number
}

export interface PortfolioSnapshot {
  id: string
  snapshotDate: string
  snapshotTime: string
  baseCurrency: CurrencyCode
  totalValueCNY: number
  totalValueUSD: number
  totalCostCNY: number
  totalCostUSD: number
  totalProfitCNY: number
  totalProfitUSD: number
  exchangeRateUSDToCNY: number
  accountBreakdown: SnapshotBreakdownItem[]
  currencyBreakdown: SnapshotBreakdownItem[]
  assetTypeBreakdown: SnapshotBreakdownItem[]
  positionCount: number
  createdAt: string
}
```

## 10.4 每日快照规则

MVP 建议：

```text
每个自然日最多保存一条自动快照
```

逻辑唯一键：

```text
snapshotDate
```

用户当天多次打开应用时，可以选择：

* 覆盖当天快照
* 只在当天首次打开时生成

建议第一版采用：

```text
当天首次打开时生成
```

后续可以增加手动更新快照功能。

## 10.5 快照中的汇率

快照必须保存当时使用的汇率。

否则未来汇率变化后，无法准确还原当时人民币和美元口径下的资产值。

## 10.6 快照中的分布数据

快照中保存汇总后的分布数据，而不是只保存总金额。

这样未来可以展示：

* 账户资产结构变化
* 币种资产结构变化
* 资产类型结构变化

## 10.7 示例

```json
{
  "id": "snapshot_2026-08-04",
  "snapshotDate": "2026-08-04",
  "snapshotTime": "2026-08-04T22:00:00.000Z",
  "baseCurrency": "CNY",
  "totalValueCNY": 2863524,
  "totalValueUSD": 397711.67,
  "totalCostCNY": 2500000,
  "totalCostUSD": 347222.22,
  "totalProfitCNY": 363524,
  "totalProfitUSD": 50489.45,
  "exchangeRateUSDToCNY": 7.2,
  "accountBreakdown": [],
  "currencyBreakdown": [],
  "assetTypeBreakdown": [],
  "positionCount": 12,
  "createdAt": "2026-08-04T22:00:00.000Z"
}
```

---

# 十一、AppSetting 设置表

## 11.1 用途

保存用户的应用偏好。

## 11.2 TypeScript 类型

```ts
export type ThemeMode =
  | 'system'
  | 'light'
  | 'dark'

export type ProfitColorMode =
  | 'china'
  | 'international'

export interface AppSetting {
  key: string
  value: unknown
  updatedAt: string
}
```

建议以键值形式保存设置。

示例：

```json
{
  "key": "defaultCurrency",
  "value": "CNY",
  "updatedAt": "2026-08-04T10:00:00.000Z"
}
```

## 11.3 初期设置项

```text
defaultCurrency
theme
profitColorMode
numberPrecision
priceRefreshInterval
fundRefreshInterval
exchangeRateRefreshInterval
selectedPriceProviders
selectedFundProvider
selectedExchangeRateProvider
lastBackupAt
snapshotCreationMode
```

## 11.4 默认值

建议默认配置：

```json
{
  "defaultCurrency": "CNY",
  "theme": "system",
  "profitColorMode": "china",
  "numberPrecision": 2,
  "priceRefreshInterval": 0,
  "fundRefreshInterval": 0,
  "exchangeRateRefreshInterval": 0,
  "snapshotCreationMode": "first_open_of_day"
}
```

`0` 表示不自动刷新，仅手动刷新。

---

# 十二、Metadata 元数据表

## 12.1 用途

保存应用内部维护信息。

例如：

* 数据库版本
* 最近迁移时间
* 最近完整计算时间
* 最近备份时间
* 应用首次启动时间
* 最近快照日期

## 12.2 TypeScript 类型

```ts
export interface Metadata {
  key: string
  value: unknown
  updatedAt: string
}
```

## 12.3 建议字段

```text
databaseSchemaVersion
appInitializedAt
lastMigrationAt
lastPortfolioCalculationAt
lastSnapshotDate
lastBackupAt
```

AppSetting 面向用户偏好。

Metadata 面向系统内部状态。

两者不要混用。

---

# 十三、计算结果模型

计算结果不直接作为数据库表保存。

建议定义只读类型：

```ts
export interface PositionValuation {
  positionId: string
  accountId: string
  assetId: string
  quantity: number
  averageCost: number
  currentPrice?: number
  totalCost: number
  marketValue?: number
  profitLoss?: number
  profitRate?: number
  nativeCurrency: CurrencyCode
  valueCNY?: number
  valueUSD?: number
  priceStatus: 'valid' | 'stale' | 'missing'
}
```

投资组合汇总类型：

```ts
export interface PortfolioSummary {
  totalValueCNY: number
  totalValueUSD: number
  totalCostCNY: number
  totalCostUSD: number
  totalProfitCNY: number
  totalProfitUSD: number
  positions: PositionValuation[]
  accountBreakdown: SummaryItem[]
  currencyBreakdown: SummaryItem[]
  assetTypeBreakdown: SummaryItem[]
  missingPriceCount: number
  stalePriceCount: number
  calculatedAt: string
}
```

这些对象由计算服务实时生成。

---

# 十四、核心计算规则

## 14.1 持仓总成本

```text
总成本 = 数量 × 平均成本
```

## 14.2 股票和基金市值

```text
当前市值 = 数量 × 当前价格
```

基金的数量表示基金份额。

基金价格表示最新单位净值。

## 14.3 现金市值

```text
现金市值 = 现金金额
```

不需要乘以普通市场价格。

## 14.4 浮动盈亏

```text
浮动盈亏 = 当前市值 - 总成本
```

## 14.5 盈亏率

```text
盈亏率 = 浮动盈亏 ÷ 总成本
```

当总成本为零时，不计算盈亏率。

## 14.6 人民币换算

对于美元资产：

```text
人民币市值 = 美元市值 × USD/CNY
```

对于人民币资产：

```text
人民币市值 = 原始人民币市值
```

## 14.7 美元换算

对于人民币资产：

```text
美元市值 = 人民币市值 ÷ USD/CNY
```

对于美元资产：

```text
美元市值 = 原始美元市值
```

## 14.8 缺失价格

如果非现金资产没有有效价格：

* 不猜测价格。
* 不自动使用成本价作为当前价。
* 标记为缺失价格。
* 总资产中可选择暂时排除。
* 页面必须明确提示未计入项目数量。

建议默认行为：

```text
缺失价格的持仓不计入当前总市值
```

但仍显示持仓成本。

## 14.9 过期价格

过期价格仍可参与计算，但页面需要明确标记。

例如：

```text
QQQ：550.25 USD
更新时间：2 天前
状态：可能过期
```

---

# 十五、金额与精度设计

## 15.1 不使用字符串直接计算

数据库可以存储 number，但业务层应避免不受控的浮点计算。

对于重要金额计算，可以使用精确小数库，例如：

```text
decimal.js
```

## 15.2 精度建议

| 数据类型   |   建议计算精度 |
| ------ | -------: |
| 股票价格   |    6 位小数 |
| 基金净值   |    8 位小数 |
| 汇率     |    8 位小数 |
| 持仓数量   |    8 位小数 |
| 中间金额   |    8 位小数 |
| 页面展示金额 | 默认 2 位小数 |
| 页面展示比例 | 默认 2 位小数 |

## 15.3 四舍五入时机

禁止在每个中间步骤都四舍五入。

推荐：

```text
原始数据
    ↓
高精度计算
    ↓
最终展示时格式化
```

资产快照保存时，可以保留 4 至 8 位小数。

---

# 十六、时间与日期设计

## 16.1 时间格式

完整时间统一使用 ISO 8601：

```text
2026-08-04T10:00:00.000Z
```

## 16.2 日期格式

只有日期时使用：

```text
2026-08-04
```

## 16.3 区分三个时间

价格数据必须区分：

```text
priceDate
fetchedAt
updatedAt
```

含义：

* `priceDate`：该价格实际对应的市场时间或净值日期
* `fetchedAt`：应用获取该价格的时间
* `updatedAt`：数据库记录最后修改时间

## 16.4 用户时区

每日快照以用户本地时区的自然日为准。

不要直接用 UTC 日期判断“今天”。

---

# 十七、Dexie 数据库定义建议

第一版示例：

```ts
import Dexie, { type Table } from 'dexie'

export class OpenPortfolioDatabase extends Dexie {
  accounts!: Table<Account, string>
  assets!: Table<Asset, string>
  positions!: Table<Position, string>
  prices!: Table<Price, string>
  exchangeRates!: Table<ExchangeRate, string>
  portfolioSnapshots!: Table<PortfolioSnapshot, string>
  appSettings!: Table<AppSetting, string>
  metadata!: Table<Metadata, string>

  constructor() {
    super('openportfolio')

    this.version(1).stores({
      accounts:
        'id, name, type, defaultCurrency, market, isArchived, sortOrder, updatedAt',

      assets:
        'id, symbol, name, assetType, market, currency, [market+symbol+currency], isActive, updatedAt',

      positions:
        'id, accountId, assetId, [accountId+assetId], isClosed, updatedAt',

      prices:
        'id, &assetId, currency, priceType, providerId, priceDate, fetchedAt, status',

      exchangeRates:
        'id, &[baseCurrency+quoteCurrency], baseCurrency, quoteCurrency, rateDate, fetchedAt, status',

      portfolioSnapshots:
        'id, &snapshotDate, snapshotTime, createdAt',

      appSettings:
        '&key, updatedAt',

      metadata:
        '&key, updatedAt'
    })
  }
}
```

说明：

* `&` 表示唯一索引。
* `[accountId+assetId]` 表示复合索引。
* IndexedDB 索引只服务查询，不代表完整业务校验。
* Service 层仍需主动检查逻辑唯一性。

---

# 十八、数据写入规则

## 18.1 创建资产和持仓

新增持仓流程：

```text
用户填写持仓
    │
    ▼
验证账户存在
    │
    ▼
根据市场、代码、币种查找 Asset
    │
    ├── 已存在：复用 Asset
    │
    └── 不存在：创建 Asset
    │
    ▼
检查账户中是否已有该 Asset 的 Position
    │
    ├── 已存在：提示编辑或合并
    │
    └── 不存在：创建 Position
```

## 18.2 删除持仓

默认采用软删除思路：

```text
isClosed = true
quantity = 0
```

原因：

* 以后可能需要保留历史。
* 防止误删。
* 便于未来接入交易记录。

MVP 页面可提供“永久删除”，但必须二次确认。

## 18.3 删除资产

只有满足以下条件时才允许删除 Asset：

* 没有任何 Position 引用。
* 没有任何 Price 引用。
* 不属于系统内置现金资产。

否则只能设置：

```text
isActive = false
```

---

# 十九、导入与导出数据结构

## 19.1 备份根结构

```ts
export interface BackupFile {
  format: 'openportfolio-backup'
  schemaVersion: number
  appVersion: string
  exportedAt: string
  data: {
    accounts: Account[]
    assets: Asset[]
    positions: Position[]
    prices: Price[]
    exchangeRates: ExchangeRate[]
    portfolioSnapshots: PortfolioSnapshot[]
    appSettings: AppSetting[]
    metadata: Metadata[]
  }
}
```

## 19.2 示例

```json
{
  "format": "openportfolio-backup",
  "schemaVersion": 1,
  "appVersion": "0.1.0",
  "exportedAt": "2026-08-04T22:00:00.000Z",
  "data": {
    "accounts": [],
    "assets": [],
    "positions": [],
    "prices": [],
    "exchangeRates": [],
    "portfolioSnapshots": [],
    "appSettings": [],
    "metadata": []
  }
}
```

## 19.3 导入校验

导入文件必须校验：

* format 是否正确
* schemaVersion 是否支持
* data 是否存在
* 必需数组是否存在
* id 是否重复
* 外键关系是否有效
* 数值是否合法
* 币种是否合法
* 日期格式是否合法

---

# 二十、数据库迁移规则

每次数据结构变更必须：

1. 提升 Dexie 数据库版本。
2. 编写迁移函数。
3. 保留用户原有数据。
4. 增加迁移测试。
5. 更新 DATA_MODEL.md。
6. 更新 CHANGELOG.md。

示例：

```ts
this.version(2)
  .stores({
    positions:
      'id, accountId, assetId, [accountId+assetId], priceMode, isClosed, updatedAt'
  })
  .upgrade(async transaction => {
    await transaction
      .table('positions')
      .toCollection()
      .modify(position => {
        if (!position.priceMode) {
          position.priceMode = 'auto'
        }
      })
  })
```

禁止在数据库升级时直接清空旧表。

---

# 二十一、基础校验规则

## 21.1 Account

* name 不能为空。
* defaultCurrency 必须合法。
* sortOrder 必须为有限数字。
* 同名账户允许存在，但页面应提示。

## 21.2 Asset

* symbol 不能为空。
* name 不能为空。
* currency 必须合法。
* market 必须合法。
* assetType 必须合法。
* 相同逻辑唯一键不得重复。

## 21.3 Position

* accountId 必须存在。
* assetId 必须存在。
* quantity 不得为负。
* averageCost 不得为负。
* manualPrice 不得为负。
* 同账户同资产不得重复。

## 21.4 Price

* assetId 必须存在。
* price 必须大于或等于零。
* currency 必须与资产币种一致。
* priceDate 必须合法。
* providerId 不能为空。

## 21.5 ExchangeRate

* baseCurrency 不能等于 quoteCurrency。
* rate 必须大于零。
* 同一币种对不得重复。

## 21.6 Snapshot

* snapshotDate 必须合法。
* 同一天不得重复自动快照。
* 汇率必须大于零。
* 汇总金额必须为有限数字。

---

# 二十二、建议的系统内置数据

首次启动时可以自动创建少量基础数据。

## 22.1 默认设置

```text
默认统计币种：CNY
主题：跟随系统
涨跌颜色：中国习惯
自动刷新：关闭
```

## 22.2 默认汇率

不建议写入虚假的实时汇率。

首次启动时：

* 提示用户输入 USD/CNY。
* 或允许点击自动获取。
* 未设置汇率前，只展示原币种金额。

## 22.3 默认现金资产

可以按需自动创建：

```text
CASH_CNY
CASH_USD
```

也可以在用户首次创建现金持仓时创建。

推荐后者，避免数据库中出现未使用资产。

---

# 二十三、MVP 暂不加入 Transaction 表

当前版本只记录“现在持有什么”。

优点：

* 数据模型简单。
* 用户录入成本低。
* 可以快速完成 MVP。
* 足以解决总资产统计问题。

暂时无法精确计算：

* 已实现收益
* 资金加权收益率
* 时间加权收益率
* 每笔手续费
* 每笔税费
* 分红收益
* 入金出金影响

后续需要这些功能时，再新增：

```text
transactions
cashFlows
dividends
fees
taxes
```

当前 Position 模型必须保留未来升级空间，但不能为了未来功能把 MVP 设计得过于复杂。

---

# 二十四、数据模型验收标准

数据模型满足以下条件时，可以进入开发：

1. 可以创建多个账户。
2. 可以创建 A 股、美股、基金和现金资产。
3. 同一资产可以存在于不同账户。
4. 同一账户不会重复创建相同持仓。
5. 股票和基金可以共用 Position 模型。
6. 人民币和美元份额基金可以明确区分。
7. 自动价格和手动价格可以共存。
8. 汇率方向定义明确。
9. 可以计算人民币和美元资产总额。
10. 缺失价格不会导致应用崩溃。
11. 价格过期仍可使用并显示警告。
12. 每日资产快照可以独立保存。
13. 数据可以完整导入和导出。
14. 数据库未来可以迁移升级。
15. 当前模型不依赖任何特定行情接口。

---

# 二十五、当前决定摘要

| 项目    | 当前决定                    |
| ----- | ----------------------- |
| 账户与资产 | 分开保存                    |
| 当前持仓  | Position 表              |
| 交易流水  | MVP 暂不实现                |
| 股票与基金 | 共用 Asset 和 Position     |
| 现金    | 作为特殊 Asset              |
| 当前价格  | 每项资产保留一条                |
| 价格历史  | MVP 暂不实现                |
| 手动价格  | Position 控制模式           |
| 汇率    | 保存 USD/CNY，反向推导         |
| 快照    | 每日最多一条                  |
| 计算结果  | 实时计算，不重复保存              |
| 金额精度  | 高精度计算，展示时舍入             |
| 删除策略  | 优先归档或软删除                |
| 主键    | 字符串 ID                  |
| 本地数据库 | IndexedDB + Dexie       |
| 数据迁移  | Dexie version + upgrade |
