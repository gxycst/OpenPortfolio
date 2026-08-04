# OpenPortfolio 技术架构设计

**文档版本：** V0.1
**对应 PRD：** V0.1
**当前阶段：** Web MVP
**部署目标：** GitHub Pages
**架构原则：** Local-first、Offline-friendly、Provider-agnostic

---

## 一、架构目标

OpenPortfolio 第一阶段采用纯前端、本地优先架构。

系统需要做到：

1. 不依赖自建服务器。
2. 不依赖云端数据库。
3. 不要求用户注册或登录。
4. 用户持仓、成本和总资产默认只保存在本地。
5. GitHub Pages 可以直接部署和访问。
6. 外部行情接口失效时，核心记账功能仍然可用。
7. 后续可以扩展为桌面应用。
8. 后续更换行情来源时，不需要重写业务页面。

---

## 二、第一阶段技术选型

### 2.1 前端框架

建议使用：

* Vue 3
* TypeScript
* Vite
* Vue Router
* Pinia

不建议新项目继续使用 Vue 2。

选择 Vue 3 的主要原因：

* 更适合新项目长期维护。
* TypeScript 支持更加自然。
* 与现代前端工具链配合更方便。
* 未来社区贡献者更容易参与。
* 更适合组件化和组合式逻辑复用。

### 2.2 本地数据库

建议使用：

* IndexedDB
* Dexie.js

IndexedDB 是浏览器内置的本地数据库。

Dexie.js 作为 IndexedDB 的封装层，负责：

* 数据库初始化
* 表结构定义
* 索引查询
* 数据增删改查
* 数据库版本升级
* 事务处理

业务代码不直接调用原生 IndexedDB API。

### 2.3 状态管理

建议使用 Pinia。

Pinia 只负责保存当前页面需要使用的临时状态，例如：

* 当前选择的统计币种
* 当前账户筛选条件
* 当前持仓筛选条件
* 当前页面加载状态
* 行情刷新状态
* 用户界面设置

Pinia 不作为永久数据库使用。

永久数据必须写入 IndexedDB。

### 2.4 图表

建议使用 ECharts。

第一阶段可能使用的图表包括：

* 账户资产分布
* 币种资产分布
* 资产类型分布
* 历史总资产曲线
* 历史收益曲线

MVP V0.1 可以暂不安装图表库，等资产录入和计算功能稳定后再增加。

### 2.5 样式与组件

第一阶段建议选择一种方式：

* 使用轻量级 UI 组件库。
* 自建基础组件。
* 使用 CSS 变量配合少量通用组件。

不建议同时引入多个 UI 框架。

建议优先保证：

* 桌面浏览器体验
* 平板适配
* 基础手机适配
* 明暗主题扩展能力

### 2.6 测试工具

建议使用：

* Vitest：单元测试
* Playwright：端到端测试

第一阶段优先测试：

* 市值计算
* 盈亏计算
* 汇率换算
* 数据导入
* 数据导出
* 数据库迁移

---

## 三、系统总体结构

```text
用户界面层
    │
    ▼
状态与页面协调层
    │
    ▼
业务服务层
    │
    ├── 资产计算服务
    ├── 账户服务
    ├── 持仓服务
    ├── 汇率服务
    ├── 行情服务
    ├── 快照服务
    └── 备份服务
    │
    ▼
数据访问层
    │
    ├── Account Repository
    ├── Asset Repository
    ├── Position Repository
    ├── Price Repository
    ├── Exchange Rate Repository
    └── Snapshot Repository
    │
    ▼
Dexie / IndexedDB
```

外部数据更新采用单独链路：

```text
行情更新操作
    │
    ▼
Price Service
    │
    ▼
Provider Registry
    │
    ├── A 股 Provider
    ├── 美股 Provider
    ├── 基金 Provider
    ├── 汇率 Provider
    └── Manual Provider
    │
    ▼
外部公开数据接口
```

---

## 四、核心架构原则

### 4.1 页面不得直接操作数据库

错误示例：

```text
PositionPage
    └── 直接调用 Dexie 表
```

正确结构：

```text
PositionPage
    │
    ▼
PositionService
    │
    ▼
PositionRepository
    │
    ▼
Dexie
```

这样做可以保证：

* 页面组件更加简单。
* 存储方案可以替换。
* 业务逻辑可以测试。
* 数据库升级更容易处理。
* 未来桌面版可以复用服务层。

### 4.2 页面不得直接请求行情接口

错误示例：

```text
Dashboard.vue
    └── fetch 某个行情网址
```

正确结构：

```text
Dashboard
    │
    ▼
PriceService
    │
    ▼
PriceProvider
    │
    ▼
外部接口
```

以后更换数据源时，只修改 Provider。

### 4.3 计算结果原则上不重复存储

以下内容属于可计算数据：

* 持仓总成本
* 当前市值
* 浮动盈亏
* 盈亏比例
* 人民币折算市值
* 美元折算市值

这些数据通常由以下原始数据即时计算：

* 持仓数量
* 平均成本
* 当前价格
* 汇率

数据库保存原始数据，不把所有计算结果重复保存。

资产快照除外。

历史快照需要保存计算结果，否则未来价格变化后无法还原当时的资产状态。

### 4.4 本地数据优先加载

应用启动流程：

```text
启动应用
    │
    ▼
打开本地数据库
    │
    ▼
读取本地账户和持仓
    │
    ▼
立即展示上次保存的数据
    │
    ▼
检查数据更新时间
    │
    ▼
按设置决定是否请求远程更新
```

不得等待外部行情请求完成后才显示页面。

### 4.5 自动数据与手动数据并存

每条价格需要包含来源类型：

```text
auto
manual
```

当用户手动设置价格后，系统不得在没有提示的情况下立即覆盖。

推荐规则：

* 自动模式：行情更新可以覆盖缓存价格。
* 手动模式：自动更新跳过该持仓。
* 恢复自动模式后：下次刷新重新获取行情。

---

## 五、建议项目目录

```text
openportfolio/
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── DATA_PROVIDERS.md
│   └── ROADMAP.md
│
├── public/
│
├── src/
│   ├── app/
│   │   ├── router/
│   │   └── initialization/
│   │
│   ├── components/
│   │   ├── base/
│   │   ├── account/
│   │   ├── position/
│   │   └── dashboard/
│   │
│   ├── pages/
│   │   ├── DashboardPage.vue
│   │   ├── AccountsPage.vue
│   │   ├── PositionsPage.vue
│   │   ├── FundsPage.vue
│   │   ├── DataUpdatePage.vue
│   │   └── SettingsPage.vue
│   │
│   ├── database/
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── seed.ts
│   │
│   ├── repositories/
│   │   ├── accountRepository.ts
│   │   ├── assetRepository.ts
│   │   ├── positionRepository.ts
│   │   ├── priceRepository.ts
│   │   ├── exchangeRateRepository.ts
│   │   └── snapshotRepository.ts
│   │
│   ├── services/
│   │   ├── accountService.ts
│   │   ├── positionService.ts
│   │   ├── portfolioService.ts
│   │   ├── priceService.ts
│   │   ├── exchangeRateService.ts
│   │   ├── snapshotService.ts
│   │   └── backupService.ts
│   │
│   ├── providers/
│   │   ├── types.ts
│   │   ├── registry.ts
│   │   ├── stocks/
│   │   ├── funds/
│   │   └── exchangeRates/
│   │
│   ├── calculations/
│   │   ├── marketValue.ts
│   │   ├── profitLoss.ts
│   │   ├── currencyConversion.ts
│   │   └── portfolioSummary.ts
│   │
│   ├── stores/
│   │   ├── appStore.ts
│   │   ├── portfolioStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── types/
│   │   ├── account.ts
│   │   ├── asset.ts
│   │   ├── position.ts
│   │   ├── price.ts
│   │   ├── currency.ts
│   │   └── snapshot.ts
│   │
│   ├── utils/
│   │   ├── date.ts
│   │   ├── number.ts
│   │   ├── validation.ts
│   │   └── identifiers.ts
│   │
│   ├── App.vue
│   └── main.ts
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 六、数据库架构

### 6.1 数据库名称

建议：

```text
openportfolio
```

### 6.2 初期数据表

```text
accounts
assets
positions
prices
exchangeRates
snapshots
settings
metadata
```

### 6.3 表之间的关系

```text
Account
    │
    └── Position
            │
            └── Asset
                    │
                    └── Price
```

汇率独立保存：

```text
ExchangeRate
```

每日汇总结果保存为：

```text
Snapshot
```

### 6.4 数据库版本

数据库必须显式维护版本。

例如：

```text
Version 1
    accounts
    assets
    positions
    prices
    exchangeRates
    settings

Version 2
    增加 snapshots

Version 3
    positions 增加 priceMode
```

每次修改数据库结构时：

1. 增加数据库版本。
2. 编写迁移逻辑。
3. 不直接删除用户旧数据。
4. 增加迁移测试。
5. 在 CHANGELOG 中记录变化。

---

## 七、核心领域对象

### 7.1 Account

表示资产所在的逻辑账户，例如：

* 嘉信理财
* 招商证券
* 天天基金
* 人民币现金账户

### 7.2 Asset

表示资产本身，例如：

* 贵州茅台
* QQQ
* 某只 QDII 基金
* 美元现金

同一个 Asset 可以出现在多个账户中。

### 7.3 Position

表示某个账户持有某项资产的情况。

Position 主要保存：

* 账户
* 资产
* 数量
* 平均成本
* 价格模式

### 7.4 Price

表示资产最近一次有效价格。

Price 需要区分：

* 行情价格
* 基金净值
* 手动价格

### 7.5 ExchangeRate

表示两个币种之间的换算关系。

初期至少支持：

* USD/CNY

系统可以根据该汇率推导：

* CNY/USD

### 7.6 Snapshot

表示某一天某一时刻的资产汇总结果。

Snapshot 不等同于价格历史。

它保存的是用户整个投资组合当时的状态。

---

## 八、资产计算模块

所有金融计算放在独立的 `calculations` 目录。

计算函数应当：

* 不访问数据库。
* 不访问网络。
* 不依赖页面组件。
* 输入明确。
* 输出明确。
* 可以单独进行单元测试。

示例：

```ts
calculateMarketValue(quantity, price)
calculateTotalCost(quantity, averageCost)
calculateProfitLoss(marketValue, totalCost)
calculateProfitRate(profitLoss, totalCost)
convertCurrency(amount, rate)
calculatePortfolioSummary(positions, prices, rates)
```

金额计算需要统一约定精度。

建议：

* 数据库存储原始小数值。
* 展示层负责格式化。
* 汇率保留较高精度。
* 不在计算中间步骤过早四舍五入。
* 最终显示时再按用户设置格式化。

---

## 九、数据源 Provider 架构

### 9.1 Provider 的目的

不同数据源应向系统返回统一结构。

页面和业务服务不关心数据来自：

* 某个免费接口
* 某个付费接口
* 本地文件
* 用户手动输入

### 9.2 股票行情统一返回结构

```ts
interface PriceQuote {
  symbol: string
  market: string
  price: number
  currency: string
  priceTime: string
  fetchedAt: string
  providerId: string
  delayed: boolean
}
```

### 9.3 基金净值统一返回结构

```ts
interface FundQuote {
  fundCode: string
  nav: number
  currency: string
  navDate: string
  fetchedAt: string
  providerId: string
}
```

### 9.4 汇率统一返回结构

```ts
interface ExchangeRateQuote {
  baseCurrency: string
  quoteCurrency: string
  rate: number
  rateDate: string
  fetchedAt: string
  providerId: string
}
```

### 9.5 Provider 错误处理

Provider 发生错误时，统一返回或抛出可识别错误：

* NETWORK_ERROR
* RATE_LIMITED
* SYMBOL_NOT_FOUND
* INVALID_RESPONSE
* PROVIDER_UNAVAILABLE
* CORS_BLOCKED
* UNKNOWN_ERROR

系统收到错误后：

1. 不删除旧价格。
2. 保留最近一次成功数据。
3. 记录失败时间和原因。
4. 向用户显示简洁提示。
5. 必要时尝试备用 Provider。

---

## 十、浏览器环境限制

由于第一版运行在 GitHub Pages 中，需要接受以下限制：

### 10.1 数据与浏览器绑定

数据保存在当前浏览器和当前站点域名下。

换浏览器或换设备后，数据不会自动出现。

解决方式：

* 支持完整备份导出。
* 支持完整备份导入。
* 在设置页面提醒用户定期备份。

### 10.2 清除浏览器数据可能导致丢失

用户清除站点数据后，IndexedDB 可能被删除。

因此产品必须：

* 在首次使用时提示本地存储风险。
* 提供一键备份。
* 展示上次备份时间。
* 在长时间未备份时进行提醒。

### 10.3 外部接口可能存在跨域限制

部分行情接口不允许浏览器直接访问。

因此某些在 Node.js 中可用的接口，在 GitHub Pages 网页中可能因 CORS 失败。

处理原则：

* Provider 开发前先验证浏览器跨域可用性。
* 不把无法从浏览器直接访问的数据源作为唯一来源。
* 始终保留手动录入能力。
* 后续可选配用户自行部署的代理服务，但不作为 MVP 必需条件。

### 10.4 浏览器不能后台长期定时执行

关闭网页后，系统不能保证继续定时更新。

因此 Web MVP 的更新方式以以下两种为主：

* 用户主动点击刷新。
* 页面打开期间按低频间隔刷新。

每日快照可以在用户当天首次打开应用时生成，而不是依赖服务器定时任务。

---

## 十一、备份与恢复架构

### 11.1 备份格式

第一阶段建议使用 JSON 文件。

示例：

```text
openportfolio-backup-2026-08-04.json
```

备份文件包含：

* schemaVersion
* appVersion
* exportedAt
* accounts
* assets
* positions
* prices
* exchangeRates
* snapshots
* settings

### 11.2 导入流程

```text
选择备份文件
    │
    ▼
解析 JSON
    │
    ▼
验证文件结构
    │
    ▼
检查 schemaVersion
    │
    ▼
展示导入摘要
    │
    ▼
用户确认
    │
    ▼
事务写入数据库
    │
    ▼
重新计算资产
```

### 11.3 导入安全规则

* 导入前自动生成当前数据备份。
* 导入失败时回滚事务。
* 不接受未知格式文件。
* 不执行备份文件中的任何代码。
* 明确区分“合并导入”和“覆盖恢复”。
* MVP 首先实现覆盖恢复，合并导入后续再做。

---

## 十二、路由设计

建议初期路由：

```text
/                  首页仪表盘
/accounts          账户管理
/positions         全部持仓
/funds             基金持仓
/data-update       数据更新
/settings          设置
```

GitHub Pages 部署时需要避免刷新子路由导致页面不存在。

MVP 可以选择：

* Hash Router

例如：

```text
/#/positions
```

这种方式部署最简单。

后续使用自定义域名或额外配置时，再评估 History Router。

---

## 十三、部署架构

部署流程：

```text
开发者提交代码到 GitHub
    │
    ▼
GitHub Actions
    │
    ├── 安装依赖
    ├── 类型检查
    ├── 执行测试
    ├── 构建项目
    └── 发布 dist
    │
    ▼
GitHub Pages
```

建议：

* `main` 分支用于稳定版本。
* 功能开发使用独立分支。
* Pull Request 通过测试后合并。
* GitHub Pages 只部署 `main` 分支构建结果。

---

## 十四、MVP 开发顺序

### 阶段一：项目骨架

* 初始化 Vue 3 + TypeScript + Vite。
* 配置路由。
* 配置 Pinia。
* 配置基础布局。
* 配置 GitHub Pages 构建。
* 创建文档目录。

### 阶段二：本地数据库

* 安装并配置 Dexie。
* 定义第一版数据库结构。
* 实现 Repository。
* 增加示例数据。
* 验证刷新页面后数据仍然存在。

### 阶段三：账户管理

* 新增账户。
* 编辑账户。
* 删除账户。
* 账户列表。
* 表单校验。

### 阶段四：持仓管理

* 新增股票持仓。
* 新增基金持仓。
* 新增现金。
* 编辑持仓。
* 删除持仓。
* 持仓筛选。

### 阶段五：计算和仪表盘

* 计算成本。
* 计算市值。
* 计算盈亏。
* 进行人民币和美元换算。
* 首页汇总展示。

### 阶段六：备份恢复

* 导出 JSON。
* 导入 JSON。
* 数据格式校验。
* 导入失败回滚。
* 备份提醒。

### 阶段七：数据更新

* Provider 接口定义。
* 手动价格 Provider。
* 手动汇率 Provider。
* 再逐步接入自动行情来源。

---

## 十五、第一阶段明确不做

项目初始化阶段暂不实现：

* 自动行情接口
* 基金自动净值
* 自动汇率
* 历史收益曲线
* Electron 桌面版
* 用户登录
* 云同步
* 券商账户同步
* 多人协作
* AI 投资分析

第一阶段的目标只有一个：

> 用户能够可靠地在本地录入资产，并正确看到人民币和美元口径的总资产。

---

## 十六、架构验收标准

技术架构初期满足以下条件即可通过：

1. 项目可以在本地启动。
2. 项目可以构建为静态文件。
3. 项目可以部署至 GitHub Pages。
4. 路由刷新不会导致 404。
5. IndexedDB 可以正常初始化。
6. 用户新增的数据刷新后仍然存在。
7. 页面不直接调用 Dexie。
8. 页面不直接请求行情接口。
9. 金融计算函数拥有单元测试。
10. 数据可以完整导出。
11. 导出的数据可以恢复。
12. 断网后仍可查看和修改本地数据。
13. 外部接口失败不会阻止应用启动。
14. 数据库结构可以通过版本迁移升级。

---

## 十七、后续演进方向

### Web V1

* PWA
* 历史资产快照
* 自动行情
* 自动汇率
* 图表分析
* 加密备份

### Desktop V1

* Electron 或其他桌面容器
* SQLite
* 本地文件备份
* 更强的定时任务
* 更多不支持浏览器跨域的数据源

### 可选同步版本

只有未来明确需要多设备同步时，才考虑：

* 用户账户
* 端到端加密
* 自托管同步服务
* 云端同步

云同步不得成为本地版正常运行的前提。

---

## 十八、当前技术决策摘要

| 项目    | 当前决定             |
| ----- | ---------------- |
| 产品形态  | 纯前端 Web 应用       |
| 部署方式  | GitHub Pages     |
| 前端框架  | Vue 3            |
| 开发语言  | TypeScript       |
| 构建工具  | Vite             |
| 本地数据库 | IndexedDB        |
| 数据库封装 | Dexie.js         |
| 状态管理  | Pinia            |
| 路由模式  | Hash Router      |
| 数据备份  | JSON 导入导出        |
| 行情更新  | 后续通过 Provider 接入 |
| 首版价格  | 先支持手动录入          |
| 云端服务  | 不使用              |
| 桌面客户端 | 后续评估             |
