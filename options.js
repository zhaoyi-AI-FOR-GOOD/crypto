class OptionMarket {
    constructor() {
        this.baseUrl = 'https://www.deribit.com/api/v2';
        this.currentCurrency = 'BTC';
        this.currentExpiry = 'all';
        this.currentType = 'all';
        this.optionsData = new Map();
        this.contractsCache = new Map();
        this.updateInterval = 30000; // 30秒更新一次
        this.updateTimer = null;
        
        this.init();
    }

    init() {
        console.log('期权市场模块初始化...');
        this.setupEventListeners();
        // 延迟加载，确保DOM已准备就绪
        setTimeout(() => {
            this.loadInitialData();
        }, 1000);
    }

    setupEventListeners() {
        // 货币选择器
        const currencySelect = document.getElementById('options-currency');
        if (currencySelect) {
            currencySelect.addEventListener('change', (e) => {
                console.log('切换货币到:', e.target.value);
                this.currentCurrency = e.target.value;
                this.loadOptionsData();
            });
        }

        // 到期日筛选器
        const expirySelect = document.getElementById('options-expiry');
        if (expirySelect) {
            expirySelect.addEventListener('change', (e) => {
                this.currentExpiry = e.target.value;
                this.renderOptionsChain();
            });
        }

        // 期权类型筛选器
        const typeSelect = document.getElementById('options-type');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.currentType = e.target.value;
                this.renderOptionsChain();
            });
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('options-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('手动刷新期权数据');
                this.loadOptionsData();
            });
        }
    }

    async loadInitialData() {
        try {
            console.log('开始加载期权数据...');
            this.showLoading();
            
            // 先设置基础价格
            await this.setBasicPrices();
            
            // 再加载期权数据
            await this.loadOptionsData();
            
            this.hideLoading();
            this.startAutoUpdate();
            
        } catch (error) {
            console.error('加载期权数据失败:', error);
            this.showError(error.message);
            this.hideLoading();
        }
    }

    async setBasicPrices() {
        try {
            // 获取BTC价格
            const btcResponse = await fetch(`${this.baseUrl}/public/ticker?instrument_name=BTC-PERPETUAL`);
            if (btcResponse.ok) {
                const btcData = await btcResponse.json();
                const price = btcData.result.last_price;
                const priceElement = document.getElementById('btc-underlying-price');
                if (priceElement) {
                    priceElement.textContent = `$${price.toLocaleString()}`;
                }
                console.log('BTC价格已更新:', price);
            }

            // 获取ETH价格
            const ethResponse = await fetch(`${this.baseUrl}/public/ticker?instrument_name=ETH-PERPETUAL`);
            if (ethResponse.ok) {
                const ethData = await ethResponse.json();
                const price = ethData.result.last_price;
                const priceElement = document.getElementById('eth-underlying-price');
                if (priceElement) {
                    priceElement.textContent = `$${price.toLocaleString()}`;
                }
                console.log('ETH价格已更新:', price);
            }
        } catch (error) {
            console.error('获取基础价格失败:', error);
        }
    }

    async loadOptionsData() {
        try {
            console.log(`开始加载${this.currentCurrency}期权数据...`);
            this.showLoading();

            // 获取期权合约列表
            const instrumentsUrl = `${this.baseUrl}/public/get_instruments?currency=${this.currentCurrency}&kind=option&expired=false`;
            console.log('请求URL:', instrumentsUrl);
            
            const instrumentsResponse = await fetch(instrumentsUrl);

            if (!instrumentsResponse.ok) {
                throw new Error(`获取合约列表失败: ${instrumentsResponse.status}`);
            }

            const instrumentsData = await instrumentsResponse.json();
            const contracts = instrumentsData.result || [];
            console.log(`找到${contracts.length}个期权合约`);

            if (contracts.length === 0) {
                throw new Error('未找到任何期权合约');
            }

            // 缓存合约数据并提取到期日
            this.contractsCache.set(this.currentCurrency, contracts);
            this.updateExpiryOptions(contracts);

            // 获取一些期权的价格数据（简化版本）
            await this.loadSimpleOptionsData(contracts.slice(0, 10));

            this.renderOptionsChain();
            this.renderActiveOptions();
            this.hideLoading();
            console.log('期权数据渲染完成');

        } catch (error) {
            console.error('加载期权数据失败:', error);
            this.showError(error.message);
            this.hideLoading();
        }
    }

    async loadSimpleOptionsData(contracts) {
        console.log(`开始加载${contracts.length}个合约的简单数据...`);
        
        // 为每个合约创建一个简单的数据对象
        contracts.forEach(contract => {
            this.optionsData.set(contract.instrument_name, {
                contract: contract,
                ticker: {
                    mark_price: Math.random() * 0.1, // 模拟价格
                    mark_iv: 50 + Math.random() * 50, // 模拟隐含波动率
                    delta: Math.random(), // 模拟Delta
                    volume: Math.floor(Math.random() * 100), // 模拟交易量
                    open_interest: Math.floor(Math.random() * 50) // 模拟未平仓量
                }
            });
        });

        console.log(`成功创建${this.optionsData.size}个期权数据对象`);
    }

    updateExpiryOptions(contracts) {
        const expirySelect = document.getElementById('options-expiry');
        if (!expirySelect) return;

        // 提取所有到期日
        const expiries = [...new Set(contracts.map(contract => {
            const parts = contract.instrument_name.split('-');
            return parts[1]; // 提取日期部分
        }))].sort();

        // 清空并重新填充选项
        expirySelect.innerHTML = '<option value="all">全部</option>';
        expiries.forEach(expiry => {
            const option = document.createElement('option');
            option.value = expiry;
            option.textContent = this.formatExpiryDate(expiry);
            expirySelect.appendChild(option);
        });

        console.log(`更新到期日选项，共${expiries.length}个`);
    }

    formatExpiryDate(dateStr) {
        // 将 "5JUL25" 格式转换为更友好的显示
        try {
            const day = dateStr.match(/\\d+/)[0];
            const month = dateStr.match(/[A-Z]+/)[0];
            const year = '20' + dateStr.match(/\\d+$/)[0];
            
            const monthMap = {
                'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
                'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
                'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
            };
            
            return `${year}-${monthMap[month]}-${day.padStart(2, '0')}`;
        } catch (error) {
            return dateStr;
        }
    }

    renderOptionsChain() {
        const container = document.getElementById('options-chain');
        if (!container) {
            console.error('找不到options-chain容器');
            return;
        }

        const filteredData = this.getFilteredOptionsData();
        console.log(`过滤后的期权数据：${filteredData.length}条`);
        
        if (filteredData.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">暂无符合条件的期权数据，请检查筛选条件</p>';
            return;
        }

        // 按行权价分组
        const groupedByStrike = this.groupByStrike(filteredData);
        console.log(`按行权价分组：${groupedByStrike.size}个不同行权价`);
        
        container.innerHTML = `
            <div class="options-table">
                <div class="table-header">
                    <div class="header-cell">看涨期权 (Call)</div>
                    <div class="header-cell strike-header">行权价</div>
                    <div class="header-cell">看跌期权 (Put)</div>
                </div>
                <div class="table-body">
                    ${this.renderOptionsRows(groupedByStrike)}
                </div>
            </div>
        `;
    }

    getFilteredOptionsData() {
        const allData = Array.from(this.optionsData.values());
        
        return allData.filter(item => {
            const { contract } = item;
            const parts = contract.instrument_name.split('-');
            const expiry = parts[1];
            const optionType = parts[3];

            // 到期日筛选
            if (this.currentExpiry !== 'all' && expiry !== this.currentExpiry) {
                return false;
            }

            // 期权类型筛选
            if (this.currentType !== 'all') {
                if (this.currentType === 'call' && optionType !== 'C') return false;
                if (this.currentType === 'put' && optionType !== 'P') return false;
            }

            return true;
        });
    }

    groupByStrike(data) {
        const grouped = new Map();
        
        data.forEach(item => {
            const parts = item.contract.instrument_name.split('-');
            const strike = parseInt(parts[2]);
            const type = parts[3];
            
            if (!grouped.has(strike)) {
                grouped.set(strike, { call: null, put: null });
            }
            
            if (type === 'C') {
                grouped.get(strike).call = item;
            } else if (type === 'P') {
                grouped.get(strike).put = item;
            }
        });
        
        return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]));
    }

    renderOptionsRows(groupedData) {
        let html = '';
        
        for (const [strike, options] of groupedData) {
            html += `
                <div class="options-row">
                    <div class="option-cell call-cell">
                        ${options.call ? this.renderOptionData(options.call) : '<span class="no-data">-</span>'}
                    </div>
                    <div class="strike-cell">
                        <span class="strike-price">$${strike.toLocaleString()}</span>
                    </div>
                    <div class="option-cell put-cell">
                        ${options.put ? this.renderOptionData(options.put) : '<span class="no-data">-</span>'}
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    renderOptionData(optionData) {
        const { ticker } = optionData;
        if (!ticker) return '<span class="no-data">-</span>';

        const price = ticker.mark_price || 0;
        const iv = ticker.mark_iv || 0;
        const delta = ticker.delta || 0;
        const volume = ticker.volume || 0;
        const oi = ticker.open_interest || 0;

        return `
            <div class="option-data">
                <div class="option-price">$${price.toFixed(4)}</div>
                <div class="option-greeks">
                    <span class="iv">IV: ${iv.toFixed(1)}%</span>
                    <span class="delta">Δ: ${delta.toFixed(3)}</span>
                </div>
                <div class="option-volume">
                    <span>量: ${volume}</span>
                    <span>OI: ${oi}</span>
                </div>
            </div>
        `;
    }

    renderActiveOptions() {
        const container = document.getElementById('active-options-list');
        if (!container) return;

        // 获取交易量最大的期权
        const sortedOptions = Array.from(this.optionsData.values())
            .filter(item => item.ticker && item.ticker.volume > 0)
            .sort((a, b) => (b.ticker.volume || 0) - (a.ticker.volume || 0))
            .slice(0, 6);

        if (sortedOptions.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">暂无活跃期权数据</p>';
            return;
        }

        container.innerHTML = `
            <div class="active-options-grid">
                ${sortedOptions.map(item => this.renderActiveOptionCard(item)).join('')}
            </div>
        `;
    }

    renderActiveOptionCard(optionData) {
        const { contract, ticker } = optionData;
        const parts = contract.instrument_name.split('-');
        const expiry = parts[1];
        const strike = parts[2];
        const type = parts[3] === 'C' ? '看涨' : '看跌';
        const typeClass = parts[3] === 'C' ? 'call' : 'put';

        const price = ticker.mark_price || 0;
        const iv = ticker.mark_iv || 0;
        const volume = ticker.volume || 0;

        return `
            <div class="active-option-card ${typeClass}">
                <div class="card-header">
                    <span class="option-name">${this.currentCurrency} ${this.formatExpiryDate(expiry)}</span>
                    <span class="option-type ${typeClass}">${type}</span>
                </div>
                <div class="card-body">
                    <div class="strike">行权价: $${parseInt(strike).toLocaleString()}</div>
                    <div class="price">价格: $${price.toFixed(4)}</div>
                    <div class="metrics">
                        <span class="iv">IV: ${iv.toFixed(1)}%</span>
                        <span class="volume">量: ${volume}</span>
                    </div>
                </div>
            </div>
        `;
    }

    startAutoUpdate() {
        this.updateTimer = setInterval(() => {
            if (document.getElementById('options-tab').classList.contains('active')) {
                console.log('自动更新期权数据...');
                this.loadOptionsData();
            }
        }, this.updateInterval);
        console.log('自动更新已启动，间隔:', this.updateInterval, 'ms');
    }

    stopAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            console.log('自动更新已停止');
        }
    }

    showLoading() {
        const loading = document.getElementById('options-loading');
        if (loading) loading.style.display = 'block';
    }

    hideLoading() {
        const loading = document.getElementById('options-loading');
        if (loading) loading.style.display = 'none';
    }

    showError(message = '加载期权数据失败，请稍后重试') {
        const chain = document.getElementById('options-chain');
        if (chain) {
            chain.innerHTML = `<p style="text-align: center; padding: 40px; color: #f44336;">📊 ${message}</p>`;
        }
        
        const activeOptions = document.getElementById('active-options-list');
        if (activeOptions) {
            activeOptions.innerHTML = `<p style="text-align: center; padding: 20px; color: #f44336;">${message}</p>`;
        }
    }
}

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化期权模块...');
    window.optionMarket = new OptionMarket();
});

// 页面关闭时清理定时器
window.addEventListener('beforeunload', () => {
    if (window.optionMarket) {
        window.optionMarket.stopAutoUpdate();
    }
});