class PortfolioManager {
    constructor() {
        this.holdings = [];
        this.loadHoldings();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const addBtn = document.getElementById('add-holding-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddHoldingModal());
        }
    }

    loadHoldings() {
        const saved = localStorage.getItem('cryptoHoldings');
        this.holdings = saved ? JSON.parse(saved) : [];
    }

    saveHoldings() {
        localStorage.setItem('cryptoHoldings', JSON.stringify(this.holdings));
    }

    showAddHoldingModal() {
        const modal = this.createAddHoldingModal();
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    createAddHoldingModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🔹 添加持仓</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="coin-select">选择币种:</label>
                        <select id="coin-select">
                            <option value="">选择币种...</option>
                            <option value="bitcoin">比特币 (BTC)</option>
                            <option value="ethereum">以太坊 (ETH)</option>
                            <option value="binancecoin">币安币 (BNB)</option>
                            <option value="cardano">卡尔达诺 (ADA)</option>
                            <option value="solana">Solana (SOL)</option>
                            <option value="polkadot">波卡 (DOT)</option>
                            <option value="dogecoin">狗狗币 (DOGE)</option>
                            <option value="avalanche-2">雪崩 (AVAX)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="amount-input">持有数量:</label>
                        <input type="number" id="amount-input" placeholder="0.00" step="0.00000001" min="0">
                    </div>
                    <div class="form-group">
                        <label for="buy-price-input">购买价格 (USD):</label>
                        <input type="number" id="buy-price-input" placeholder="0.00" step="0.01" min="0">
                    </div>
                    <div class="form-group">
                        <label for="buy-date-input">购买日期:</label>
                        <input type="date" id="buy-date-input">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">取消</button>
                    <button class="btn btn-primary" onclick="window.portfolioManager.addHolding()">添加</button>
                </div>
            </div>
        `;

        // 设置默认日期为今天
        const today = new Date().toISOString().split('T')[0];
        setTimeout(() => {
            document.getElementById('buy-date-input').value = today;
        }, 100);

        return modal;
    }

    addHolding() {
        const coinId = document.getElementById('coin-select').value;
        const amount = parseFloat(document.getElementById('amount-input').value);
        const buyPrice = parseFloat(document.getElementById('buy-price-input').value);
        const buyDate = document.getElementById('buy-date-input').value;

        if (!coinId || !amount || !buyPrice || !buyDate) {
            alert('请填写所有必填字段');
            return;
        }

        const holding = {
            id: Date.now(),
            coinId,
            amount,
            buyPrice,
            buyDate,
            addedAt: new Date().toISOString()
        };

        this.holdings.push(holding);
        this.saveHoldings();
        this.renderPortfolio();
        
        // 关闭模态框
        document.querySelector('.modal').remove();
    }

    async renderPortfolio() {
        const container = document.getElementById('holdings-list');
        
        if (this.holdings.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">暂无持仓数据，点击上方按钮添加持仓</p>';
            this.updatePortfolioSummary(0, 0, 0);
            return;
        }

        try {
            // 获取当前价格
            const coinIds = [...new Set(this.holdings.map(h => h.coinId))];
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`);
            const priceData = await response.json();

            let totalValue = 0;
            let totalCost = 0;
            let totalDailyChange = 0;

            container.innerHTML = '';

            this.holdings.forEach(holding => {
                const currentPrice = priceData[holding.coinId]?.usd || 0;
                const dailyChange = priceData[holding.coinId]?.usd_24h_change || 0;
                
                const currentValue = holding.amount * currentPrice;
                const cost = holding.amount * holding.buyPrice;
                const profit = currentValue - cost;
                const profitPercent = cost > 0 ? ((profit / cost) * 100) : 0;
                const dailyChangeValue = holding.amount * currentPrice * (dailyChange / 100);

                totalValue += currentValue;
                totalCost += cost;
                totalDailyChange += dailyChangeValue;

                const row = this.createHoldingRow(holding, currentPrice, profit, profitPercent, dailyChangeValue);
                container.appendChild(row);
            });

            const totalProfit = totalValue - totalCost;
            this.updatePortfolioSummary(totalValue, totalDailyChange, totalProfit);

        } catch (error) {
            console.error('加载投资组合数据失败:', error);
            container.innerHTML = '<p style="text-align: center; color: #f44336; padding: 40px;">加载数据失败，请稍后重试</p>';
        }
    }

    createHoldingRow(holding, currentPrice, profit, profitPercent, dailyChange) {
        const row = document.createElement('div');
        row.className = 'holding-row';
        
        const coinName = this.getCoinName(holding.coinId);
        const currentValue = holding.amount * currentPrice;
        const profitClass = profit >= 0 ? 'change-positive' : 'change-negative';
        const dailyClass = dailyChange >= 0 ? 'change-positive' : 'change-negative';
        
        row.innerHTML = `
            <div class="holding-info">
                <div class="holding-name">${coinName}</div>
                <div class="holding-amount">${holding.amount.toFixed(8)} ${this.getCoinSymbol(holding.coinId)}</div>
            </div>
            <div class="holding-prices">
                <div class="current-price">$${currentPrice.toFixed(2)}</div>
                <div class="buy-price">买入: $${holding.buyPrice.toFixed(2)}</div>
            </div>
            <div class="holding-values">
                <div class="current-value">$${currentValue.toFixed(2)}</div>
                <div class="daily-change ${dailyClass}">今日: ${dailyChange >= 0 ? '+' : ''}$${dailyChange.toFixed(2)}</div>
            </div>
            <div class="holding-profit">
                <div class="profit-amount ${profitClass}">${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}</div>
                <div class="profit-percent ${profitClass}">${profit >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%</div>
            </div>
            <div class="holding-actions">
                <button class="btn-small btn-danger" onclick="window.portfolioManager.removeHolding(${holding.id})">删除</button>
            </div>
        `;

        return row;
    }

    updatePortfolioSummary(totalValue, dailyChange, totalProfit) {
        document.getElementById('portfolio-value').textContent = `$${totalValue.toFixed(2)}`;
        
        const dailyElement = document.getElementById('portfolio-daily-change');
        const dailyClass = dailyChange >= 0 ? 'change-positive' : 'change-negative';
        dailyElement.textContent = `${dailyChange >= 0 ? '+' : ''}$${dailyChange.toFixed(2)}`;
        dailyElement.className = `value ${dailyClass}`;

        const totalElement = document.getElementById('portfolio-total-change');
        const totalClass = totalProfit >= 0 ? 'change-positive' : 'change-negative';
        totalElement.textContent = `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`;
        totalElement.className = `value ${totalClass}`;
    }

    removeHolding(holdingId) {
        if (confirm('确定要删除这个持仓吗？')) {
            this.holdings = this.holdings.filter(h => h.id !== holdingId);
            this.saveHoldings();
            this.renderPortfolio();
        }
    }

    getCoinName(coinId) {
        const names = {
            'bitcoin': '比特币',
            'ethereum': '以太坊',
            'binancecoin': '币安币',
            'cardano': '卡尔达诺',
            'solana': 'Solana',
            'polkadot': '波卡',
            'dogecoin': '狗狗币',
            'avalanche-2': '雪崩'
        };
        return names[coinId] || coinId;
    }

    getCoinSymbol(coinId) {
        const symbols = {
            'bitcoin': 'BTC',
            'ethereum': 'ETH',
            'binancecoin': 'BNB',
            'cardano': 'ADA',
            'solana': 'SOL',
            'polkadot': 'DOT',
            'dogecoin': 'DOGE',
            'avalanche-2': 'AVAX'
        };
        return symbols[coinId] || coinId.toUpperCase();
    }
}

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    window.portfolioManager = new PortfolioManager();
});