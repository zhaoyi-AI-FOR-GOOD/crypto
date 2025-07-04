class TechnicalAnalyzer {
    constructor() {
        this.currentCoin = 'bitcoin';
        this.priceData = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        const coinSelect = document.getElementById('analysis-coin-select');
        if (coinSelect) {
            coinSelect.addEventListener('change', (e) => {
                this.currentCoin = e.target.value;
                this.loadAnalysisData();
            });
        }
    }

    async loadAnalysisData() {
        try {
            // 获取历史价格数据 (30天)
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/${this.currentCoin}/market_chart?vs_currency=usd&days=30&interval=daily`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }

            const data = await response.json();
            this.priceData = data.prices.map(price => price[1]);
            
            this.renderPriceChart(data);
            this.calculateTechnicalIndicators();
            
        } catch (error) {
            console.error('加载技术分析数据失败:', error);
            this.showAnalysisError();
        }
    }

    renderPriceChart(data) {
        const chartContainer = document.getElementById('price-chart');
        
        // 创建简单的价格图表
        const prices = data.prices;
        const minPrice = Math.min(...prices.map(p => p[1]));
        const maxPrice = Math.max(...prices.map(p => p[1]));
        const priceRange = maxPrice - minPrice;
        
        // 创建SVG图表
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '300');
        svg.setAttribute('viewBox', '0 0 800 300');
        
        // 创建价格线
        const pathData = prices.map((price, index) => {
            const x = (index / (prices.length - 1)) * 800;
            const y = 300 - ((price[1] - minPrice) / priceRange) * 250 - 25;
            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#4CAF50');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        
        // 添加渐变填充
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'defs');\n        const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');\n        linearGradient.setAttribute('id', 'priceGradient');\n        linearGradient.setAttribute('x1', '0%');\n        linearGradient.setAttribute('y1', '0%');\n        linearGradient.setAttribute('x2', '0%');\n        linearGradient.setAttribute('y2', '100%');\n        \n        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');\n        stop1.setAttribute('offset', '0%');\n        stop1.setAttribute('stop-color', '#4CAF50');\n        stop1.setAttribute('stop-opacity', '0.3');\n        \n        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');\n        stop2.setAttribute('offset', '100%');\n        stop2.setAttribute('stop-color', '#4CAF50');\n        stop2.setAttribute('stop-opacity', '0.1');\n        \n        linearGradient.appendChild(stop1);\n        linearGradient.appendChild(stop2);\n        gradient.appendChild(linearGradient);\n        \n        const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');\n        fillPath.setAttribute('d', pathData + ` L 800 275 L 0 275 Z`);\n        fillPath.setAttribute('fill', 'url(#priceGradient)');\n        \n        svg.appendChild(gradient);\n        svg.appendChild(fillPath);\n        svg.appendChild(path);\n        \n        // 添加价格标签\n        const priceLabel = document.createElement('div');\n        priceLabel.className = 'chart-info';\n        priceLabel.innerHTML = `\n            <div class=\"chart-title\">${this.getCoinName(this.currentCoin)} 30天价格走势</div>\n            <div class=\"price-range\">最高: $${maxPrice.toFixed(2)} | 最低: $${minPrice.toFixed(2)}</div>\n        `;\n        \n        chartContainer.innerHTML = '';\n        chartContainer.appendChild(priceLabel);\n        chartContainer.appendChild(svg);\n    }\n\n    calculateTechnicalIndicators() {\n        if (this.priceData.length < 14) {\n            this.showInsufficientDataError();\n            return;\n        }\n\n        // 计算RSI\n        const rsi = this.calculateRSI(this.priceData, 14);\n        \n        // 计算移动平均线\n        const ma7 = this.calculateMA(this.priceData, 7);\n        const ma25 = this.calculateMA(this.priceData, 25);\n        \n        // 计算MACD\n        const macd = this.calculateMACD(this.priceData);\n        \n        this.renderIndicators(rsi, ma7, ma25, macd);\n    }\n\n    calculateRSI(prices, period = 14) {\n        if (prices.length < period + 1) return null;\n        \n        let gains = 0;\n        let losses = 0;\n        \n        // 计算初始平均增益和损失\n        for (let i = 1; i <= period; i++) {\n            const change = prices[i] - prices[i - 1];\n            if (change >= 0) {\n                gains += change;\n            } else {\n                losses -= change;\n            }\n        }\n        \n        gains /= period;\n        losses /= period;\n        \n        if (losses === 0) return 100;\n        \n        const rs = gains / losses;\n        const rsi = 100 - (100 / (1 + rs));\n        \n        return rsi;\n    }\n\n    calculateMA(prices, period) {\n        if (prices.length < period) return null;\n        \n        const lastPrices = prices.slice(-period);\n        const sum = lastPrices.reduce((acc, price) => acc + price, 0);\n        \n        return sum / period;\n    }\n\n    calculateMACD(prices) {\n        if (prices.length < 26) return null;\n        \n        const ema12 = this.calculateEMA(prices, 12);\n        const ema26 = this.calculateEMA(prices, 26);\n        \n        if (!ema12 || !ema26) return null;\n        \n        return ema12 - ema26;\n    }\n\n    calculateEMA(prices, period) {\n        if (prices.length < period) return null;\n        \n        const multiplier = 2 / (period + 1);\n        let ema = prices[0];\n        \n        for (let i = 1; i < prices.length; i++) {\n            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));\n        }\n        \n        return ema;\n    }\n\n    renderIndicators(rsi, ma7, ma25, macd) {\n        // RSI指标\n        const rsiElement = document.getElementById('rsi-value');\n        if (rsi !== null) {\n            const rsiColor = rsi > 70 ? '#f44336' : rsi < 30 ? '#4CAF50' : '#FF9800';\n            rsiElement.innerHTML = `<span style=\"color: ${rsiColor}\">${rsi.toFixed(2)}</span>`;\n            \n            // 添加RSI解释\n            let rsiSignal = '';\n            if (rsi > 70) rsiSignal = '超买';\n            else if (rsi < 30) rsiSignal = '超卖';\n            else rsiSignal = '中性';\n            \n            rsiElement.innerHTML += `<br><small style=\"color: #666;\">${rsiSignal}</small>`;\n        } else {\n            rsiElement.textContent = '数据不足';\n        }\n\n        // 移动平均线\n        const maElement = document.getElementById('ma-value');\n        if (ma7 !== null && ma25 !== null) {\n            const currentPrice = this.priceData[this.priceData.length - 1];\n            const ma7Trend = currentPrice > ma7 ? '↗' : '↘';\n            const ma25Trend = currentPrice > ma25 ? '↗' : '↘';\n            \n            maElement.innerHTML = `\n                MA7: $${ma7.toFixed(2)} ${ma7Trend}<br>\n                <small style=\"color: #666;\">MA25: $${ma25.toFixed(2)} ${ma25Trend}</small>\n            `;\n        } else {\n            maElement.textContent = '数据不足';\n        }\n\n        // MACD指标\n        const macdElement = document.getElementById('macd-value');\n        if (macd !== null) {\n            const macdColor = macd > 0 ? '#4CAF50' : '#f44336';\n            const macdSignal = macd > 0 ? '看涨' : '看跌';\n            \n            macdElement.innerHTML = `\n                <span style=\"color: ${macdColor}\">${macd.toFixed(4)}</span><br>\n                <small style=\"color: #666;\">${macdSignal}</small>\n            `;\n        } else {\n            macdElement.textContent = '数据不足';\n        }\n    }\n\n    showAnalysisError() {\n        const chartContainer = document.getElementById('price-chart');\n        chartContainer.innerHTML = '<p style=\"color: #f44336; text-align: center; padding: 40px;\">📊 加载技术分析数据失败</p>';\n        \n        document.getElementById('rsi-value').textContent = '错误';\n        document.getElementById('macd-value').textContent = '错误';\n        document.getElementById('ma-value').textContent = '错误';\n    }\n\n    showInsufficientDataError() {\n        document.getElementById('rsi-value').textContent = '数据不足';\n        document.getElementById('macd-value').textContent = '数据不足';\n        document.getElementById('ma-value').textContent = '数据不足';\n    }\n\n    getCoinName(coinId) {\n        const names = {\n            'bitcoin': '比特币',\n            'ethereum': '以太坊',\n            'binancecoin': '币安币'\n        };\n        return names[coinId] || coinId;\n    }\n}\n\n// 在页面加载时初始化\ndocument.addEventListener('DOMContentLoaded', () => {\n    window.technicalAnalyzer = new TechnicalAnalyzer();\n});