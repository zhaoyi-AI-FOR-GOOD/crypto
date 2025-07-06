// =============================================
//   期权策略分析模块 - Options Strategy Analyzer
//   基于Deribit API的专业期权策略分析工具
// =============================================

class OptionStrategyAnalyzer {
    constructor() {
        this.baseUrl = 'https://www.deribit.com/api/v2';
        this.currentCurrency = 'BTC';
        this.strategyLegs = [];
        this.underlyingPrice = 0;
        this.riskFreeRate = 0.05; // 5% 无风险利率
        this.chart = null;
        
        this.init();
    }

    init() {
        console.log('期权策略分析模块初始化...');
        try {
            this.setupEventListeners();
            this.initializePnLChart();
            
            // 立即设置默认数据，然后尝试加载真实数据
            this.underlyingPrice = 108390; // 默认BTC价格
            this.addDefaultStrategyLeg();
            
            // 延迟加载真实数据
            setTimeout(() => {
                this.loadMarketData();
            }, 500);
            
            console.log('期权策略分析模块初始化完成');
        } catch (error) {
            console.error('期权策略分析模块初始化失败:', error);
        }
    }

    setupEventListeners() {
        // 策略模板选择器
        const templateSelect = document.getElementById('strategy-template');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                this.loadStrategyTemplate(e.target.value);
            });
        }

        // 添加策略腿按钮
        const addLegBtn = document.getElementById('add-leg-btn');
        if (addLegBtn) {
            addLegBtn.addEventListener('click', () => {
                this.addStrategyLeg();
            });
        }

        // 计算按钮
        const calculateBtn = document.getElementById('strategy-calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.calculateStrategy();
            });
        }

        // 分析标签切换
        const analysisTabs = document.querySelectorAll('.analysis-tab');
        analysisTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchAnalysisTab(e.target.dataset.tab);
            });
        });

        // 视图控制切换
        const viewBtns = document.querySelectorAll('.view-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });
    }

    async loadMarketData() {
        try {
            console.log('加载市场数据...');
            
            // 尝试获取BTC当前价格，如果失败则使用模拟数据
            try {
                const response = await fetch(`${this.baseUrl}/public/ticker?instrument_name=BTC-PERPETUAL`);
                if (response.ok) {
                    const data = await response.json();
                    this.underlyingPrice = data.result.last_price;
                    console.log('BTC当前价格 (实时):', this.underlyingPrice);
                } else {
                    throw new Error('API响应失败');
                }
            } catch (apiError) {
                console.warn('无法获取实时数据，使用模拟价格:', apiError.message);
                // 使用模拟的BTC价格
                this.underlyingPrice = 108390; // 模拟价格
                console.log('BTC当前价格 (模拟):', this.underlyingPrice);
            }
            
            // 如果没有策略腿，添加一个默认的
            if (this.strategyLegs.length === 0) {
                this.addDefaultStrategyLeg();
            }
            
        } catch (error) {
            console.error('加载市场数据失败:', error);
            // 即使出错也要设置默认价格
            this.underlyingPrice = 108390;
            if (this.strategyLegs.length === 0) {
                this.addDefaultStrategyLeg();
            }
        }
    }

    addDefaultStrategyLeg() {
        const defaultLeg = {
            id: Date.now(),
            type: 'call',
            action: 'buy',
            quantity: 1,
            strike: Math.round(this.underlyingPrice / 1000) * 1000, // 近似当前价格的整千
            expiry: '5JUL25',
            premium: 0.05,
            iv: 65
        };
        
        this.strategyLegs.push(defaultLeg);
        this.renderStrategyLegs();
    }

    addStrategyLeg() {
        const newLeg = {
            id: Date.now(),
            type: 'call',
            action: 'buy',
            quantity: 1,
            strike: Math.round(this.underlyingPrice / 1000) * 1000,
            expiry: '5JUL25',
            premium: 0.05,
            iv: 65
        };
        
        this.strategyLegs.push(newLeg);
        this.renderStrategyLegs();
    }

    removeStrategyLeg(legId) {
        this.strategyLegs = this.strategyLegs.filter(leg => leg.id !== legId);
        this.renderStrategyLegs();
        this.calculateStrategy();
    }

    renderStrategyLegs() {
        const container = document.getElementById('strategy-legs');
        if (!container) return;

        container.innerHTML = this.strategyLegs.map(leg => `
            <div class="strategy-leg" data-leg-id="${leg.id}">
                <div class="leg-header">
                    <span class="leg-type ${leg.action}">${leg.action.toUpperCase()} ${leg.type.toUpperCase()}</span>
                    <button class="remove-leg-btn" onclick="window.strategyAnalyzer.removeStrategyLeg(${leg.id})">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div class="leg-controls">
                    <div class="control-row">
                        <div class="control-group">
                            <label class="control-label">Type</label>
                            <select class="leg-input" data-field="type" data-leg-id="${leg.id}">
                                <option value="call" ${leg.type === 'call' ? 'selected' : ''}>Call</option>
                                <option value="put" ${leg.type === 'put' ? 'selected' : ''}>Put</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label class="control-label">Action</label>
                            <select class="leg-input" data-field="action" data-leg-id="${leg.id}">
                                <option value="buy" ${leg.action === 'buy' ? 'selected' : ''}>Buy</option>
                                <option value="sell" ${leg.action === 'sell' ? 'selected' : ''}>Sell</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label class="control-label">Quantity</label>
                            <input type="number" class="leg-input" value="${leg.quantity}" min="1" max="100" 
                                   data-field="quantity" data-leg-id="${leg.id}">
                        </div>
                    </div>
                    <div class="control-row">
                        <div class="control-group">
                            <label class="control-label">Strike</label>
                            <input type="number" class="leg-input" value="${leg.strike}" step="1000" 
                                   data-field="strike" data-leg-id="${leg.id}">
                        </div>
                        <div class="control-group">
                            <label class="control-label">Premium</label>
                            <input type="number" class="leg-input" value="${leg.premium}" step="0.001" min="0" 
                                   data-field="premium" data-leg-id="${leg.id}">
                        </div>
                        <div class="control-group">
                            <label class="control-label">IV %</label>
                            <input type="number" class="leg-input" value="${leg.iv}" step="1" min="1" max="200" 
                                   data-field="iv" data-leg-id="${leg.id}">
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // 为输入框添加事件监听器
        container.querySelectorAll('.leg-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.updateLegParameter(e.target);
            });
        });
    }

    updateLegParameter(input) {
        const legId = parseInt(input.dataset.legId);
        const field = input.dataset.field;
        const value = input.type === 'number' ? parseFloat(input.value) : input.value;
        
        const leg = this.strategyLegs.find(l => l.id === legId);
        if (leg) {
            leg[field] = value;
            
            // 实时计算策略
            if (['strike', 'premium', 'iv', 'quantity'].includes(field)) {
                this.calculateStrategy();
            }
        }
    }

    loadStrategyTemplate(templateName) {
        console.log('加载策略模板:', templateName);
        
        if (templateName === 'custom') {
            this.strategyLegs = [];
            this.addDefaultStrategyLeg();
            return;
        }

        const atm = Math.round(this.underlyingPrice / 1000) * 1000;
        const otm_call = atm + 2000;
        const otm_put = atm - 2000;

        const templates = {
            'long-call': [
                { type: 'call', action: 'buy', quantity: 1, strike: atm, expiry: '5JUL25', premium: 0.05, iv: 65 }
            ],
            'long-put': [
                { type: 'put', action: 'buy', quantity: 1, strike: atm, expiry: '5JUL25', premium: 0.05, iv: 65 }
            ],
            'straddle': [
                { type: 'call', action: 'buy', quantity: 1, strike: atm, expiry: '5JUL25', premium: 0.05, iv: 65 },
                { type: 'put', action: 'buy', quantity: 1, strike: atm, expiry: '5JUL25', premium: 0.05, iv: 65 }
            ],
            'strangle': [
                { type: 'call', action: 'buy', quantity: 1, strike: otm_call, expiry: '5JUL25', premium: 0.03, iv: 70 },
                { type: 'put', action: 'buy', quantity: 1, strike: otm_put, expiry: '5JUL25', premium: 0.03, iv: 70 }
            ],
            'iron-condor': [
                { type: 'put', action: 'buy', quantity: 1, strike: otm_put - 1000, expiry: '5JUL25', premium: 0.02, iv: 75 },
                { type: 'put', action: 'sell', quantity: 1, strike: otm_put, expiry: '5JUL25', premium: 0.03, iv: 70 },
                { type: 'call', action: 'sell', quantity: 1, strike: otm_call, expiry: '5JUL25', premium: 0.03, iv: 70 },
                { type: 'call', action: 'buy', quantity: 1, strike: otm_call + 1000, expiry: '5JUL25', premium: 0.02, iv: 75 }
            ]
        };

        if (templates[templateName]) {
            this.strategyLegs = templates[templateName].map((leg, index) => ({
                ...leg,
                id: Date.now() + index
            }));
            this.renderStrategyLegs();
            this.calculateStrategy();
        }
    }

    calculateStrategy() {
        if (this.strategyLegs.length === 0) return;

        console.log('计算策略分析...');
        
        // 计算P&L数据
        const pnlData = this.calculatePnLCurve();
        
        // 更新图表
        this.updatePnLChart(pnlData);
        
        // 计算风险指标
        this.calculateRiskMetrics(pnlData);
        
        // 计算希腊字母
        this.calculatePortfolioGreeks();
    }

    calculatePnLCurve() {
        const priceRange = this.generatePriceRange();
        const pnlData = [];

        priceRange.forEach(price => {
            let totalPnL = 0;
            
            this.strategyLegs.forEach(leg => {
                const intrinsicValue = this.calculateIntrinsicValue(leg, price);
                const costBasis = leg.action === 'buy' ? leg.premium : -leg.premium;
                const legPnL = (intrinsicValue - costBasis) * leg.quantity;
                totalPnL += legPnL;
            });
            
            pnlData.push({
                price: price,
                pnl: totalPnL
            });
        });

        return pnlData;
    }

    generatePriceRange() {
        const currentPrice = this.underlyingPrice;
        const range = currentPrice * 0.4; // ±40%
        const start = currentPrice - range;
        const end = currentPrice + range;
        const step = (end - start) / 100;
        
        const prices = [];
        for (let price = start; price <= end; price += step) {
            prices.push(Math.round(price));
        }
        return prices;
    }

    calculateIntrinsicValue(leg, underlyingPrice) {
        if (leg.type === 'call') {
            return Math.max(0, underlyingPrice - leg.strike);
        } else {
            return Math.max(0, leg.strike - underlyingPrice);
        }
    }

    initializePnLChart() {
        const canvas = document.getElementById('pnl-chart');
        if (!canvas) {
            console.warn('P&L图表画布元素未找到');
            return;
        }

        // 检查Chart.js是否已加载
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js库未加载，稍后重试...');
            setTimeout(() => this.initializePnLChart(), 1000);
            return;
        }

        const ctx = canvas.getContext('2d');
        
        try {
            this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'P&L',
                    data: [],
                    borderColor: '#00CFBE',
                    backgroundColor: 'rgba(0, 207, 190, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Underlying Price ($)',
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#cccccc'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Profit/Loss ($)',
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#cccccc'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });
        
        console.log('P&L图表初始化成功');
        } catch (error) {
            console.error('P&L图表初始化失败:', error);
        }
    }

    updatePnLChart(pnlData) {
        if (!this.chart) return;

        const labels = pnlData.map(d => d.price);
        const data = pnlData.map(d => d.pnl);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
    }

    calculateRiskMetrics(pnlData) {
        if (!pnlData || pnlData.length === 0) return;

        const maxProfit = Math.max(...pnlData.map(d => d.pnl));
        const maxLoss = Math.min(...pnlData.map(d => d.pnl));
        
        // 寻找盈亏平衡点
        const breakevens = [];
        for (let i = 1; i < pnlData.length; i++) {
            if ((pnlData[i-1].pnl <= 0 && pnlData[i].pnl > 0) || 
                (pnlData[i-1].pnl > 0 && pnlData[i].pnl <= 0)) {
                breakevens.push(pnlData[i].price);
            }
        }

        // 计算净权利金
        const netPremium = this.strategyLegs.reduce((sum, leg) => {
            return sum + (leg.action === 'buy' ? -leg.premium : leg.premium) * leg.quantity;
        }, 0);

        // 更新显示
        this.updateElement('max-profit', maxProfit > 0 ? `$${maxProfit.toFixed(2)}` : 'Unlimited');
        this.updateElement('max-loss', maxLoss < 0 ? `$${Math.abs(maxLoss).toFixed(2)}` : '$0');
        this.updateElement('breakeven', breakevens.length > 0 ? `$${breakevens[0].toFixed(0)}` : 'N/A');
        this.updateElement('net-premium', `$${netPremium.toFixed(3)}`);
    }

    calculatePortfolioGreeks() {
        let totalDelta = 0;
        let totalGamma = 0;
        let totalTheta = 0;
        let totalVega = 0;

        this.strategyLegs.forEach(leg => {
            const greeks = this.calculateOptionGreeks(leg);
            const multiplier = leg.action === 'buy' ? 1 : -1;
            
            totalDelta += greeks.delta * multiplier * leg.quantity;
            totalGamma += greeks.gamma * multiplier * leg.quantity;
            totalTheta += greeks.theta * multiplier * leg.quantity;
            totalVega += greeks.vega * multiplier * leg.quantity;
        });

        this.updateElement('portfolio-delta', totalDelta.toFixed(3));
        this.updateElement('portfolio-gamma', totalGamma.toFixed(4));
        this.updateElement('portfolio-theta', totalTheta.toFixed(3));
        this.updateElement('portfolio-vega', totalVega.toFixed(3));
    }

    calculateOptionGreeks(leg) {
        // 简化的希腊字母计算
        const S = this.underlyingPrice;
        const K = leg.strike;
        const T = 30 / 365; // 假设30天到期
        const r = this.riskFreeRate;
        const sigma = leg.iv / 100;

        const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const d2 = d1 - sigma * Math.sqrt(T);

        const nd1 = this.normalCDF(d1);
        const nd2 = this.normalCDF(d2);
        const npd1 = this.normalPDF(d1);

        let delta, gamma, theta, vega;

        if (leg.type === 'call') {
            delta = nd1;
            theta = (-S * npd1 * sigma / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * nd2) / 365;
        } else {
            delta = nd1 - 1;
            theta = (-S * npd1 * sigma / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * (1 - nd2)) / 365;
        }

        gamma = npd1 / (S * sigma * Math.sqrt(T));
        vega = S * npd1 * Math.sqrt(T) / 100;

        return { delta, gamma, theta, vega };
    }

    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    normalPDF(x) {
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }

    erf(x) {
        // 近似计算误差函数
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }

    switchAnalysisTab(tabName) {
        // 切换标签样式
        document.querySelectorAll('.analysis-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.analysis-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-analysis`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    switchView(viewName) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        console.log('切换视图到:', viewName);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`元素未找到: ${id}`);
        }
    }

    // 调试函数
    debugStatus() {
        console.log('=== 策略分析模块状态 ===');
        console.log('基础价格:', this.underlyingPrice);
        console.log('策略腿数量:', this.strategyLegs.length);
        console.log('图表对象:', this.chart ? '已创建' : '未创建');
        console.log('DOM元素检查:');
        console.log('- strategy-legs:', document.getElementById('strategy-legs') ? '存在' : '不存在');
        console.log('- pnl-chart:', document.getElementById('pnl-chart') ? '存在' : '不存在');
        console.log('- strategy-template:', document.getElementById('strategy-template') ? '存在' : '不存在');
        console.log('策略腿详情:', this.strategyLegs);
        console.log('========================');
    }
}

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化策略分析模块...');
    try {
        window.strategyAnalyzer = new OptionStrategyAnalyzer();
        console.log('策略分析模块创建成功');
    } catch (error) {
        console.error('策略分析模块创建失败:', error);
        // 尝试延迟重新初始化
        setTimeout(() => {
            try {
                window.strategyAnalyzer = new OptionStrategyAnalyzer();
                console.log('策略分析模块延迟创建成功');
            } catch (retryError) {
                console.error('策略分析模块延迟创建仍然失败:', retryError);
            }
        }, 2000);
    }
});

// 确保模块在窗口加载后也能正常工作
window.addEventListener('load', () => {
    if (!window.strategyAnalyzer) {
        console.log('窗口加载完成，尝试重新初始化策略分析模块...');
        try {
            window.strategyAnalyzer = new OptionStrategyAnalyzer();
        } catch (error) {
            console.error('窗口加载后策略分析模块初始化失败:', error);
        }
    }
});