import type { BackupData } from '@/repositories/backupRepository'

const demoCreatedAt = '2026-08-08T08:00:00.000Z'

export const demoBackupData: BackupData = {
  accounts: [
    {
      id: 'demo_acc_cn_stock',
      name: '银河证券',
      type: 'cn_stock',
      defaultCurrency: 'CNY',
      market: 'CN',
      isArchived: false,
      sortOrder: 1,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_acc_us_stock',
      name: 'Charles Schwab',
      type: 'us_stock',
      defaultCurrency: 'USD',
      market: 'US',
      isArchived: false,
      sortOrder: 2,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_acc_hk_stock',
      name: '富途牛牛',
      type: 'hk_stock',
      defaultCurrency: 'HKD',
      market: 'HK',
      isArchived: false,
      sortOrder: 3,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_acc_cny_fund',
      name: '支付宝场外基金',
      type: 'cny_fund',
      defaultCurrency: 'CNY',
      market: 'FUND_CN',
      isArchived: false,
      sortOrder: 4,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_acc_usd_fund',
      name: '银行美元基金',
      type: 'usd_fund',
      defaultCurrency: 'USD',
      market: 'FUND_CN',
      isArchived: false,
      sortOrder: 5,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_acc_cny_cash',
      name: '人民币现金',
      type: 'cny_cash',
      defaultCurrency: 'CNY',
      market: 'CASH',
      isArchived: false,
      sortOrder: 6,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    }
  ],
  assets: [
    {
      id: 'demo_asset_cn_513100',
      symbol: '513100',
      name: '纳指ETF国泰',
      assetType: 'etf',
      market: 'CN',
      currency: 'CNY',
      isActive: true,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_asset_us_nvda',
      symbol: 'NVDA',
      name: '英伟达',
      assetType: 'stock',
      market: 'US',
      currency: 'USD',
      isActive: true,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_asset_us_aapl',
      symbol: 'AAPL',
      name: '苹果',
      assetType: 'stock',
      market: 'US',
      currency: 'USD',
      isActive: true,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_asset_hk_00700',
      symbol: '00700',
      name: '腾讯控股',
      assetType: 'stock',
      market: 'HK',
      currency: 'HKD',
      isActive: true,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_asset_fund_020712',
      symbol: '020712',
      name: '华安三菱日联日经225ETF发起式联接(QDII)A',
      assetType: 'fund',
      market: 'FUND_CN',
      currency: 'CNY',
      fundShareClass: 'CNY',
      isActive: true,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_asset_fund_006374',
      symbol: '006374',
      name: '国富全球科技互联混合(QDII)美元现汇A',
      assetType: 'fund',
      market: 'FUND_CN',
      currency: 'USD',
      fundShareClass: 'USD',
      isActive: true,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_asset_cash_cny',
      symbol: 'CASH_CNY',
      name: '人民币现金',
      assetType: 'cash',
      market: 'CASH',
      currency: 'CNY',
      isActive: true,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    }
  ],
  positions: [
    {
      id: 'demo_pos_cn_513100',
      accountId: 'demo_acc_cn_stock',
      assetId: 'demo_asset_cn_513100',
      quantity: 10000,
      averageCost: 1.8,
      costCurrency: 'CNY',
      priceMode: 'auto',
      isClosed: false,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_pos_us_nvda',
      accountId: 'demo_acc_us_stock',
      assetId: 'demo_asset_us_nvda',
      quantity: 20,
      averageCost: 160,
      costCurrency: 'USD',
      priceMode: 'auto',
      isClosed: false,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_pos_us_aapl',
      accountId: 'demo_acc_us_stock',
      assetId: 'demo_asset_us_aapl',
      quantity: 15,
      averageCost: 190,
      costCurrency: 'USD',
      priceMode: 'auto',
      isClosed: false,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_pos_hk_00700',
      accountId: 'demo_acc_hk_stock',
      assetId: 'demo_asset_hk_00700',
      quantity: 300,
      averageCost: 380,
      costCurrency: 'HKD',
      priceMode: 'auto',
      isClosed: false,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_pos_fund_020712',
      accountId: 'demo_acc_cny_fund',
      assetId: 'demo_asset_fund_020712',
      quantity: 12000,
      averageCost: 1.12,
      holdingProfit: 3200,
      costCurrency: 'CNY',
      priceMode: 'auto',
      isClosed: false,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_pos_fund_006374',
      accountId: 'demo_acc_usd_fund',
      assetId: 'demo_asset_fund_006374',
      quantity: 1000,
      averageCost: 6.1,
      holdingProfit: 600,
      costCurrency: 'USD',
      priceMode: 'auto',
      isClosed: false,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_pos_cash_cny',
      accountId: 'demo_acc_cny_cash',
      assetId: 'demo_asset_cash_cny',
      quantity: 50000,
      averageCost: 1,
      costCurrency: 'CNY',
      priceMode: 'manual',
      manualPrice: 1,
      manualPriceDate: '2026-08-08',
      isClosed: false,
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    }
  ],
  prices: [
    {
      id: 'demo_price_cn_513100',
      assetId: 'demo_asset_cn_513100',
      price: 2.266,
      currency: 'CNY',
      priceType: 'market',
      providerId: 'demo',
      priceDate: '2026-08-08',
      fetchedAt: demoCreatedAt,
      delayed: true,
      status: 'valid',
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_price_us_nvda',
      assetId: 'demo_asset_us_nvda',
      price: 223.96,
      currency: 'USD',
      priceType: 'market',
      providerId: 'demo',
      priceDate: '2026-08-08',
      fetchedAt: demoCreatedAt,
      delayed: true,
      status: 'valid',
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_price_us_aapl',
      assetId: 'demo_asset_us_aapl',
      price: 313.33,
      currency: 'USD',
      priceType: 'market',
      providerId: 'demo',
      priceDate: '2026-08-08',
      fetchedAt: demoCreatedAt,
      delayed: true,
      status: 'valid',
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_price_hk_00700',
      assetId: 'demo_asset_hk_00700',
      price: 620,
      currency: 'HKD',
      priceType: 'market',
      providerId: 'demo',
      priceDate: '2026-08-08',
      fetchedAt: demoCreatedAt,
      delayed: true,
      status: 'valid',
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_price_fund_020712',
      assetId: 'demo_asset_fund_020712',
      price: 1.4021,
      currency: 'CNY',
      priceType: 'nav',
      providerId: 'demo',
      priceDate: '2026-08-08',
      fetchedAt: demoCreatedAt,
      delayed: false,
      status: 'valid',
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'demo_price_fund_006374',
      assetId: 'demo_asset_fund_006374',
      price: 6.9091,
      currency: 'USD',
      priceType: 'nav',
      providerId: 'demo',
      priceDate: '2026-08-08',
      fetchedAt: demoCreatedAt,
      delayed: false,
      status: 'valid',
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    }
  ],
  exchangeRates: [
    {
      id: 'fx_usd_cny',
      baseCurrency: 'USD',
      quoteCurrency: 'CNY',
      rate: 6.7447,
      providerId: 'demo',
      rateDate: '2026-08-08',
      fetchedAt: demoCreatedAt,
      status: 'valid',
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    },
    {
      id: 'fx_hkd_cny',
      baseCurrency: 'HKD',
      quoteCurrency: 'CNY',
      rate: 0.85901,
      providerId: 'demo',
      rateDate: '2026-08-08',
      fetchedAt: demoCreatedAt,
      status: 'valid',
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt
    }
  ],
  portfolioSnapshots: [],
  appSettings: [],
  metadata: [
    {
      key: 'demoDataLoadedAt',
      value: demoCreatedAt,
      updatedAt: demoCreatedAt
    }
  ]
}
