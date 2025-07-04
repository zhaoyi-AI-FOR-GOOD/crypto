# 加密货币综合分析平台 | Crypto Analysis Platform

一个专业的加密货币市场分析工具，具备Bloomberg Terminal风格的界面设计。

## 🚀 功能特性

### 📊 市场分析
- **实时价格监控** - 基于CoinGecko API的实时价格数据
- **市场情绪分析** - 全球市场统计、热门搜索、涨跌幅榜
- **技术分析工具** - RSI、MACD、移动平均线等技术指标
- **期权市场** - 基于Deribit的BTC/ETH期权数据分析

### 💼 投资管理
- **投资组合跟踪** - 实时估值、盈亏计算
- **新币发现** - 最新上市、交易量激增、价格异动监控

### 🏦 生态系统
- **DeFi仪表板** - 总锁定价值(TVL)、协议性能监控
- **NFT市场监控** - 地板价、交易量分析

## 🎨 专业界面设计

### Bloomberg Terminal风格
- **深色专业主题** - 金融级配色方案
- **侧边栏导航** - 分组模块化导航结构
- **面板网格系统** - 12列响应式布局
- **专业字体系统** - Roboto + Roboto Mono

### 交互功能
- **智能全局搜索** - 实时搜索建议、智能关键词匹配
- **键盘快捷键** - 专业交易终端快捷键支持
- **实时状态监控** - 网络连接状态、市场状态指示器

## ⌨️ 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` | 聚焦搜索框 |
| `Ctrl+R` | 刷新数据 |
| `Ctrl+B` | 折叠/展开侧边栏 |
| `1-8` | 快速切换面板 |

## 🛠️ 技术栈

- **前端框架**: Vanilla JavaScript (ES6+)
- **样式系统**: CSS Variables + Professional Design System
- **API集成**: 
  - CoinGecko API - 加密货币市场数据
  - Deribit API - 期权市场数据
- **字体**: Google Fonts (Roboto, Roboto Mono)
- **图标**: Unicode Emoji + 自定义图标

## 🚀 快速开始

### 本地运行
```bash
# 克隆仓库
git clone https://github.com/zhaoyi-AI-FOR-GOOD/crypto.git

# 进入目录
cd crypto

# 启动本地服务器
python -m http.server 8000

# 访问应用
open http://localhost:8000
```

## 📁 项目结构

```
crypto/
├── index.html          # 主页面
├── styles.css          # 专业样式系统
├── script.js           # 主要应用逻辑
├── options.js          # 期权市场模块
├── sentiment.js        # 市场情绪模块
├── portfolio.js        # 投资组合模块
├── analysis.js         # 技术分析模块
├── defi.js            # DeFi模块
├── nft.js             # NFT模块
├── discovery.js       # 新币发现模块
└── README.md          # 项目文档
```

## 🎯 核心模块

### 1. 市场概览 (Market Overview)
- 主要加密货币实时价格
- 24小时涨跌幅
- 市值排名

### 2. 市场情绪 (Market Sentiment)
- 全球市场统计
- 热门搜索趋势
- 涨跌幅排行榜

### 3. 期权市场 (Options Market)
- BTC/ETH期权链
- 隐含波动率分析
- Put/Call比率
- 最活跃期权

### 4. 投资组合 (Portfolio)
- 持仓管理
- 实时估值
- 盈亏分析

### 5. 技术分析 (Technical Analysis)
- 价格图表
- 技术指标
- 趋势分析

## 🔧 配置说明

### API配置
- **CoinGecko API**: 无需API密钥，有请求频率限制
- **Deribit API**: 使用公开接口，无需认证

### 更新频率
- 主要数据: 30秒自动更新
- 期权数据: 30秒自动更新
- 市场状态: 30秒检查一次

## 🚀 部署说明

### GitHub Pages部署
1. Fork此仓库
2. 在Settings中启用GitHub Pages
3. 选择主分支作为源
4. 访问 `https://yourusername.github.io/crypto`

### 其他部署方式
- Vercel
- Netlify
- 任何静态文件托管服务

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 更新日志

### v1.0.0 (2024)
- ✨ 初始版本发布
- 🎨 Bloomberg Terminal风格界面
- 📊 完整的市场分析功能
- ⌨️ 专业键盘快捷键支持
- 📱 响应式设计

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [CoinGecko](https://coingecko.com) - 提供加密货币市场数据API
- [Deribit](https://deribit.com) - 提供期权市场数据API
- [Google Fonts](https://fonts.google.com) - 提供专业字体

## 📞 联系方式

- GitHub: [@zhaoyi-AI-FOR-GOOD](https://github.com/zhaoyi-AI-FOR-GOOD)
- 项目链接: [https://github.com/zhaoyi-AI-FOR-GOOD/crypto](https://github.com/zhaoyi-AI-FOR-GOOD/crypto)

---

🌟 如果这个项目对你有帮助，请给它一个星标！