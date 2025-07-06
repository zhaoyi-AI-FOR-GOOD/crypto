class CryptoDashboard {
    constructor() {
        this.apiUrl = 'https://api.coingecko.com/api/v3/coins/markets';
        this.cryptoIds = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'dogecoin', 'avalanche-2'];
        this.updateInterval = 30000; // 30秒更新一次
        this.autoUpdateTimer = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabSwitching();
        this.startMarketStatusMonitoring();
        this.loadOptionsData();
        this.startAutoUpdate();
        
        // 显示快捷键提示（首次访问）
        this.showKeyboardShortcutsHint();
    }

    showKeyboardShortcutsHint() {
        // 检查是否首次访问
        if (!localStorage.getItem('shortcuts-hint-shown')) {
            setTimeout(() => {
                console.log('💡 快捷键提示:');
                console.log('Ctrl+K - 搜索');
                console.log('Ctrl+R - 刷新数据');
                console.log('Ctrl+B - 折叠侧边栏');
                console.log('1-2 - 切换面板');
                
                localStorage.setItem('shortcuts-hint-shown', 'true');
            }, 3000);
        }
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadOptionsData());
        }

        // 全局搜索功能
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.executeSearch(e.target.value);
                }
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupTabSwitching() {
        const navItems = document.querySelectorAll('.nav-item');
        const tabContents = document.querySelectorAll('.tab-content');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        const currentTime = document.getElementById('current-time');

        // 侧边栏折叠功能
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        // 更新时间显示
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);

        // 导航项点击事件
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // 移除所有活动状态
                navItems.forEach(i => i.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // 添加活动状态
                item.classList.add('active');
                const targetTab = item.dataset.tab;
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                // 根据标签页加载相应数据
                this.loadTabData(targetTab);
            });
        });
    }

    loadTabData(tab) {
        switch (tab) {
            case 'sentiment':
                this.loadSentimentData();
                break;
            case 'options':
                this.loadOptionsData();
                break;
            case 'strategy':
                if (window.strategyAnalyzer) {
                    window.strategyAnalyzer.loadMarketData();
                }
                break;
            case 'arbitrage':
                if (window.arbitrageScanner) {
                    window.arbitrageScanner.loadMarketData();
                }
                break;
        }
    }

    async loadSentimentData() {
        try {
            // 加载全球市场数据
            const globalResponse = await fetch('https://api.coingecko.com/api/v3/global');
            if (globalResponse.ok) {
                const globalData = await globalResponse.json();
                this.renderGlobalStats(globalData.data);
            }

            // 加载热门搜索
            const trendingResponse = await fetch('https://api.coingecko.com/api/v3/search/trending');
            if (trendingResponse.ok) {
                const trendingData = await trendingResponse.json();
                this.renderTrendingCoins(trendingData.coins);
            }

            // 加载涨跌幅榜
            const marketsResponse = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h');
            if (marketsResponse.ok) {
                const marketsData = await marketsResponse.json();
                this.renderTopGainers(marketsData);
            }

            const losersResponse = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=percent_change_24h_asc&per_page=10&page=1&sparkline=false&price_change_percentage=24h');
            if (losersResponse.ok) {
                const losersData = await losersResponse.json();
                this.renderTopLosers(losersData);
            }
        } catch (error) {
            console.error('加载市场情绪数据失败:', error);
        }
    }

    renderGlobalStats(globalData) {
        const totalMarketCap = document.getElementById('total-market-cap');
        const totalVolume = document.getElementById('total-volume');
        const btcDominance = document.getElementById('btc-dominance');
        
        if (totalMarketCap) {
            totalMarketCap.textContent = this.formatMarketCap(globalData.total_market_cap.usd);
        }
        if (totalVolume) {
            totalVolume.textContent = this.formatMarketCap(globalData.total_volume.usd);
        }
        if (btcDominance) {
            btcDominance.textContent = globalData.market_cap_percentage.btc.toFixed(1) + '%';
        }
    }

    renderTrendingCoins(coins) {
        const container = document.getElementById('trending-list');
        container.innerHTML = '';

        coins.slice(0, 7).forEach((coin, index) => {
            const item = document.createElement('div');
            item.className = 'trending-item';
            item.innerHTML = `
                <img src="${coin.item.small}" alt="${coin.item.name}">
                <span class="name">${coin.item.name} (${coin.item.symbol})</span>
                <span class="rank">#${index + 1}</span>
            `;
            container.appendChild(item);
        });
    }

    renderTopGainers(coins) {
        const container = document.getElementById('top-gainers');
        container.innerHTML = '';

        coins.slice(0, 5).forEach(coin => {
            const change = coin.price_change_percentage_24h || 0;
            const item = document.createElement('div');
            item.className = 'top-item';
            item.innerHTML = `
                <img src="${coin.image}" alt="${coin.name}">
                <div class="info">
                    <div class="name">${coin.name}</div>
                    <div class="price">$${this.formatPrice(coin.current_price)}</div>
                </div>
                <div class="change change-positive">+${change.toFixed(2)}%</div>
            `;
            container.appendChild(item);
        });
    }

    renderTopLosers(coins) {
        const container = document.getElementById('top-losers');
        container.innerHTML = '';

        coins.slice(0, 5).forEach(coin => {
            const change = coin.price_change_percentage_24h || 0;
            const item = document.createElement('div');
            item.className = 'top-item';
            item.innerHTML = `
                <img src="${coin.image}" alt="${coin.name}">
                <div class="info">
                    <div class="name">${coin.name}</div>
                    <div class="price">$${this.formatPrice(coin.current_price)}</div>
                </div>
                <div class="change change-negative">${change.toFixed(2)}%</div>
            `;
            container.appendChild(item);
        });
    }


    loadOptionsData() {
        if (window.optionMarket) {
            window.optionMarket.loadOptionsData();
        }
    }


    formatPrice(price) {
        if (price < 1) {
            return price.toFixed(6);
        } else if (price < 100) {
            return price.toFixed(4);
        } else {
            return price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    }

    formatMarketCap(marketCap) {
        if (marketCap >= 1e12) {
            return (marketCap / 1e12).toFixed(2) + 'T';
        } else if (marketCap >= 1e9) {
            return (marketCap / 1e9).toFixed(2) + 'B';
        } else if (marketCap >= 1e6) {
            return (marketCap / 1e6).toFixed(2) + 'M';
        } else {
            return marketCap.toLocaleString();
        }
    }

    updateLastUpdatedTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const lastUpdatedElement = document.getElementById('last-updated-time');
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = timeString;
        }
    }

    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const currentTimeElement = document.getElementById('current-time');
        if (currentTimeElement) {
            currentTimeElement.textContent = timeString;
        }
    }

    handleGlobalSearch(query) {
        if (query.length < 2) return;
        
        // 实时搜索建议
        this.showSearchSuggestions(query);
    }

    executeSearch(query) {
        if (!query.trim()) return;
        
        console.log('执行搜索:', query);
        // 根据搜索内容切换到相应面板或高亮显示结果
        this.performSmartSearch(query.toLowerCase());
    }

    performSmartSearch(query) {
        // 智能搜索逻辑
        const searchMappings = {
            'btc': 'options',
            'bitcoin': 'options', 
            '比特币': 'options',
            'eth': 'options',
            'ethereum': 'options',
            '以太坊': 'options',
            'option': 'options',
            '期权': 'options',
            'sentiment': 'sentiment',
            '情绪': 'sentiment',
            '市场': 'sentiment'
        };

        for (const [keyword, tab] of Object.entries(searchMappings)) {
            if (query.includes(keyword)) {
                this.switchToTab(tab);
                this.highlightSearchResults(query);
                break;
            }
        }
    }

    switchToTab(tabName) {
        const navItems = document.querySelectorAll('.nav-item');
        const tabContents = document.querySelectorAll('.tab-content');
        
        navItems.forEach(item => item.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        const targetNavItem = document.querySelector(`[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(`${tabName}-tab`);
        
        if (targetNavItem && targetContent) {
            targetNavItem.classList.add('active');
            targetContent.classList.add('active');
            this.loadTabData(tabName);
        }
    }

    showSearchSuggestions(query) {
        // 搜索建议功能（可以后续扩展）
        console.log('搜索建议:', query);
    }

    highlightSearchResults(query) {
        // 高亮搜索结果（可以后续扩展）
        console.log('高亮搜索结果:', query);
    }

    handleKeyboardShortcuts(e) {
        // 专业交易终端快捷键
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'k': // Ctrl+K 聚焦搜索
                    e.preventDefault();
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) searchInput.focus();
                    break;
                case 'r': // Ctrl+R 刷新数据
                    e.preventDefault();
                    this.loadOptionsData();
                    break;
                case 'b': // Ctrl+B 折叠侧边栏
                    e.preventDefault();
                    document.getElementById('sidebar').classList.toggle('collapsed');
                    break;
            }
        }
        
        // 数字键切换面板
        if (e.key >= '1' && e.key <= '2' && !e.ctrlKey && !e.metaKey) {
            const tabMappings = {
                '1': 'options',
                '2': 'sentiment'
            };
            
            const targetTab = tabMappings[e.key];
            if (targetTab && !document.querySelector('.search-input:focus')) {
                this.switchToTab(targetTab);
            }
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    showError() {
        const error = document.getElementById('error');
        if (error) error.style.display = 'flex';
    }

    hideError() {
        const error = document.getElementById('error');
        if (error) error.style.display = 'none';
    }

    // 市场状态管理
    updateMarketStatus() {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        if (statusIndicator && statusText) {
            // 模拟连接状态检测
            const isConnected = navigator.onLine;
            
            if (isConnected) {
                statusIndicator.style.backgroundColor = 'var(--success)';
                statusText.textContent = '实时连接';
            } else {
                statusIndicator.style.backgroundColor = 'var(--danger)';
                statusText.textContent = '连接断开';
            }
        }
    }

    // 启动市场状态监控
    startMarketStatusMonitoring() {
        this.updateMarketStatus();
        
        // 监听网络状态变化
        window.addEventListener('online', () => this.updateMarketStatus());
        window.addEventListener('offline', () => this.updateMarketStatus());
        
        // 定期检查连接状态
        setInterval(() => this.updateMarketStatus(), 30000);
    }

    startAutoUpdate() {
        this.autoUpdateTimer = setInterval(() => {
            this.loadOptionsData();
        }, this.updateInterval);
    }

    stopAutoUpdate() {
        if (this.autoUpdateTimer) {
            clearInterval(this.autoUpdateTimer);
            this.autoUpdateTimer = null;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.cryptoDashboard = new CryptoDashboard();
});

// 页面关闭时清理定时器
window.addEventListener('beforeunload', () => {
    if (window.cryptoDashboard) {
        window.cryptoDashboard.stopAutoUpdate();
    }
});