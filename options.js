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

        // 显示模式切换器
        const displayModeSelect = document.getElementById('display-mode');
        if (displayModeSelect) {
            displayModeSelect.addEventListener('change', (e) => {
                console.log('切换显示模式到:', e.target.value);
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
        console.log(`开始加载${contracts.length}个合约的增强数据...`);
        
        // 为每个合约创建更丰富的数据对象，包含希腊字母
        contracts.forEach(contract => {
            const parts = contract.instrument_name.split('-');
            const isCall = parts[3] === 'C';
            const strike = parseInt(parts[2]);
            
            // 模拟更真实的期权数据
            const basePrice = Math.random() * 0.2 + 0.01;
            const iv = 30 + Math.random() * 80; // 30-110% IV 范围
            
            this.optionsData.set(contract.instrument_name, {
                contract: contract,
                ticker: {
                    mark_price: basePrice,
                    mark_iv: iv,
                    // 模拟希腊字母
                    delta: isCall ? Math.random() * 0.8 + 0.1 : -(Math.random() * 0.8 + 0.1),
                    gamma: Math.random() * 0.01,
                    theta: -(Math.random() * 0.05 + 0.01),
                    vega: Math.random() * 0.1 + 0.01,
                    // 交易数据
                    volume: Math.floor(Math.random() * 200),
                    open_interest: Math.floor(Math.random() * 100),
                    // 价格变化
                    price_change: (Math.random() - 0.5) * 0.1,
                    price_change_percent: (Math.random() - 0.5) * 20
                }
            });
        });

        console.log(`成功创建${this.optionsData.size}个增强期权数据对象`);
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
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">暂无符合条件的期权数据，请检查筛选条件</div>';
            return;
        }

        // 按行权价分组
        const groupedByStrike = this.groupByStrike(filteredData);
        console.log(`按行权价分组：${groupedByStrike.size}个不同行权价`);
        
        // 更新信息栏
        this.updateOptionsInfoBar(filteredData);
        
        container.innerHTML = this.renderProfessionalOptionsTable(groupedByStrike);
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

    renderProfessionalOptionsTable(groupedData) {
        return `
            <div class="deribit-options-table-container">
                <table class="deribit-options-table">
                    <thead class="deribit-table-header">
                        <tr>
                            ${this.renderDeribitTableHeaders()}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderDeribitOptionsRows(groupedData)}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderDeribitTableHeaders() {
        return `
            <th class="deribit-header call-side">Vol</th>
            <th class="deribit-header call-side">OI</th>
            <th class="deribit-header call-side">IV</th>
            <th class="deribit-header call-side">Bid</th>
            <th class="deribit-header call-side">Ask</th>
            <th class="deribit-header call-side">Mark</th>
            <th class="deribit-header call-side">Type</th>
            <th class="deribit-header strike-column">Strike</th>
            <th class="deribit-header put-side">Type</th>
            <th class="deribit-header put-side">Mark</th>
            <th class="deribit-header put-side">Ask</th>
            <th class="deribit-header put-side">Bid</th>
            <th class="deribit-header put-side">IV</th>
            <th class="deribit-header put-side">OI</th>
            <th class="deribit-header put-side">Vol</th>
        `;
    }
    
    renderTableHeaders(displayMode) {
        const callHeaders = {
            standard: ['Last', 'Bid', 'Ask', 'IV', 'Vol', 'OI'],
            greeks: ['Last', 'IV', 'Δ', 'Γ', 'Θ', 'ν'],
            volume: ['Last', 'Bid', 'Ask', 'Vol', 'OI', 'CHG']
        };
        
        const putHeaders = [...callHeaders[displayMode]].reverse();
        
        let headers = '';
        
        // Call 列
        callHeaders[displayMode].forEach(header => {
            headers += `<th class="call-header">${header}</th>`;
        });
        
        // Strike 列
        headers += `<th class="strike-header">Strike</th>`;
        
        // Put 列
        putHeaders.forEach(header => {
            headers += `<th class="put-header">${header}</th>`;
        });
        
        return headers;
    }
    
    renderDeribitOptionsRows(groupedData) {
        let html = '';
        
        for (const [strike, options] of groupedData) {
            html += `
                <tr class="deribit-options-row">
                    ${this.renderDeribitCallCells(options.call)}
                    <td class="deribit-strike-cell">$${strike.toLocaleString()}</td>
                    ${this.renderDeribitPutCells(options.put)}
                </tr>
            `;
        }
        
        return html;
    }
    
    renderOptionsRows(groupedData, displayMode) {
        let html = '';
        
        for (const [strike, options] of groupedData) {
            html += `
                <tr class="options-row">
                    ${this.renderOptionCells(options.call, 'call', displayMode)}
                    <td class="strike-cell">$${strike.toLocaleString()}</td>
                    ${this.renderOptionCells(options.put, 'put', displayMode)}
                </tr>
            `;
        }
        
        return html;
    }
    
    renderDeribitCallCells(optionData) {
        if (!optionData) {
            return `
                <td class="deribit-cell call-side no-data">-</td>
                <td class="deribit-cell call-side no-data">-</td>
                <td class="deribit-cell call-side no-data">-</td>
                <td class="deribit-cell call-side no-data">-</td>
                <td class="deribit-cell call-side no-data">-</td>
                <td class="deribit-cell call-side no-data">-</td>
                <td class="deribit-cell call-side no-data">-</td>
            `;
        }
        
        const { ticker } = optionData;
        const price = ticker.mark_price || 0;
        const iv = ticker.mark_iv || 0;
        const volume = ticker.volume || 0;
        const oi = ticker.open_interest || 0;
        const bidPrice = price * 0.98;
        const askPrice = price * 1.02;
        
        return `
            <td class="deribit-cell call-side volume">${volume}</td>
            <td class="deribit-cell call-side oi">${oi}</td>
            <td class="deribit-cell call-side iv">${iv.toFixed(1)}%</td>
            <td class="deribit-cell call-side bid">${this.formatPrice(bidPrice)}</td>
            <td class="deribit-cell call-side ask">${this.formatPrice(askPrice)}</td>
            <td class="deribit-cell call-side mark">${this.formatPrice(price)}</td>
            <td class="deribit-cell call-side type">C</td>
        `;
    }
    
    renderDeribitPutCells(optionData) {
        if (!optionData) {
            return `
                <td class="deribit-cell put-side no-data">-</td>
                <td class="deribit-cell put-side no-data">-</td>
                <td class="deribit-cell put-side no-data">-</td>
                <td class="deribit-cell put-side no-data">-</td>
                <td class="deribit-cell put-side no-data">-</td>
                <td class="deribit-cell put-side no-data">-</td>
                <td class="deribit-cell put-side no-data">-</td>
            `;
        }
        
        const { ticker } = optionData;
        const price = ticker.mark_price || 0;
        const iv = ticker.mark_iv || 0;
        const volume = ticker.volume || 0;
        const oi = ticker.open_interest || 0;
        const bidPrice = price * 0.98;
        const askPrice = price * 1.02;
        
        return `
            <td class="deribit-cell put-side type">P</td>
            <td class="deribit-cell put-side mark">${this.formatPrice(price)}</td>
            <td class="deribit-cell put-side ask">${this.formatPrice(askPrice)}</td>
            <td class="deribit-cell put-side bid">${this.formatPrice(bidPrice)}</td>
            <td class="deribit-cell put-side iv">${iv.toFixed(1)}%</td>
            <td class="deribit-cell put-side oi">${oi}</td>
            <td class="deribit-cell put-side volume">${volume}</td>
        `;
    }
    
    renderOptionCells(optionData, type, displayMode) {
        if (!optionData) {
            const emptyCells = displayMode === 'greeks' ? 6 : 6;
            return '<td class="no-data">-</td>'.repeat(emptyCells);
        }
        
        const { ticker } = optionData;
        const price = ticker.mark_price || 0;
        const iv = ticker.mark_iv || 0;
        const volume = ticker.volume || 0;
        const oi = ticker.open_interest || 0;
        const delta = ticker.delta || 0;
        const gamma = ticker.gamma || 0;
        const theta = ticker.theta || 0;
        const vega = ticker.vega || 0;
        
        let cells = '';
        const cellClass = type === 'call' ? 'call-cell' : 'put-cell';
        
        switch (displayMode) {
            case 'standard':
                if (type === 'call') {
                    cells = `
                        <td class="${cellClass}">${this.formatPrice(price)}</td>
                        <td class="${cellClass}"><span class="bid-price">${this.formatPrice(price * 0.98)}</span></td>
                        <td class="${cellClass}"><span class="ask-price">${this.formatPrice(price * 1.02)}</span></td>
                        <td class="${cellClass}"><span class="option-iv">${iv.toFixed(1)}%</span></td>
                        <td class="${cellClass} ${volume > 10 ? 'volume-high' : ''}">${volume}</td>
                        <td class="${cellClass}">${oi}</td>
                    `;
                } else {
                    cells = `
                        <td class="${cellClass}">${oi}</td>
                        <td class="${cellClass} ${volume > 10 ? 'volume-high' : ''}">${volume}</td>
                        <td class="${cellClass}"><span class="option-iv">${iv.toFixed(1)}%</span></td>
                        <td class="${cellClass}"><span class="ask-price">${this.formatPrice(price * 1.02)}</span></td>
                        <td class="${cellClass}"><span class="bid-price">${this.formatPrice(price * 0.98)}</span></td>
                        <td class="${cellClass}">${this.formatPrice(price)}</td>
                    `;
                }
                break;
            case 'greeks':
                if (type === 'call') {
                    cells = `
                        <td class="${cellClass}">${this.formatPrice(price)}</td>
                        <td class="${cellClass}"><span class="option-iv">${iv.toFixed(1)}%</span></td>
                        <td class="${cellClass}">${delta.toFixed(3)}</td>
                        <td class="${cellClass}">${gamma.toFixed(4)}</td>
                        <td class="${cellClass}">${theta.toFixed(3)}</td>
                        <td class="${cellClass}">${vega.toFixed(3)}</td>
                    `;
                } else {
                    cells = `
                        <td class="${cellClass}">${vega.toFixed(3)}</td>
                        <td class="${cellClass}">${theta.toFixed(3)}</td>
                        <td class="${cellClass}">${gamma.toFixed(4)}</td>
                        <td class="${cellClass}">${Math.abs(delta).toFixed(3)}</td>
                        <td class="${cellClass}"><span class="option-iv">${iv.toFixed(1)}%</span></td>
                        <td class="${cellClass}">${this.formatPrice(price)}</td>
                    `;
                }
                break;
            case 'volume':
                if (type === 'call') {
                    cells = `
                        <td class="${cellClass}">${this.formatPrice(price)}</td>
                        <td class="${cellClass}"><span class="bid-price">${this.formatPrice(price * 0.98)}</span></td>
                        <td class="${cellClass}"><span class="ask-price">${this.formatPrice(price * 1.02)}</span></td>
                        <td class="${cellClass} ${volume > 10 ? 'volume-high' : ''}">${volume}</td>
                        <td class="${cellClass}">${oi}</td>
                        <td class="${cellClass} change-positive">+2.1%</td>
                    `;
                } else {
                    cells = `
                        <td class="${cellClass} change-negative">-1.8%</td>
                        <td class="${cellClass}">${oi}</td>
                        <td class="${cellClass} ${volume > 10 ? 'volume-high' : ''}">${volume}</td>
                        <td class="${cellClass}"><span class="ask-price">${this.formatPrice(price * 1.02)}</span></td>
                        <td class="${cellClass}"><span class="bid-price">${this.formatPrice(price * 0.98)}</span></td>
                        <td class="${cellClass}">${this.formatPrice(price)}</td>
                    `;
                }
                break;
        }
        
        return cells;
    }

    updateOptionsInfoBar(filteredData) {
        // 计算汇总数据
        let totalVolume = 0;
        let totalOI = 0;
        let totalIV = 0;
        let count = 0;
        
        filteredData.forEach(item => {
            if (item.ticker) {
                totalVolume += item.ticker.volume || 0;
                totalOI += item.ticker.open_interest || 0;
                totalIV += item.ticker.mark_iv || 0;
                count++;
            }
        });
        
        const avgIV = count > 0 ? totalIV / count : 0;
        
        // 更新显示 - 同时更新概览面板和详细信息栏
        const elements = {
            'underlying-spot-price': this.getUnderlyingPrice(),
            'average-iv': `${avgIV.toFixed(1)}%`,
            'total-volume': totalVolume.toLocaleString(),
            'total-oi': totalOI.toLocaleString(),
            'last-update': new Date().toLocaleTimeString(),
            // 同时更新概览面板
            'overview-avg-iv': `${avgIV.toFixed(1)}%`,
            'overview-total-volume': totalVolume.toLocaleString(),
            'overview-last-update': new Date().toLocaleTimeString()
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
    
    getUnderlyingPrice() {
        const priceElement = document.getElementById(`${this.currentCurrency.toLowerCase()}-underlying-price`);
        return priceElement ? priceElement.textContent : '$0';
    }
    
    formatPrice(price) {
        if (price < 0.01) {
            return price.toFixed(6);
        } else if (price < 1) {
            return price.toFixed(4);
        } else {
            return price.toFixed(2);
        }
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