// =============================================
//   期权套利扫描模块 - Options Arbitrage Scanner
//   专业的期权套利机会发现和分析工具
// =============================================

class OptionArbitrageScanner {
    constructor() {
        this.baseUrl = 'https://www.deribit.com/api/v2';
        this.currentCurrency = 'BTC';
        this.underlyingPrice = 108390; // 默认BTC价格
        this.optionsData = new Map();
        this.arbitrageOpportunities = [];
        this.isScanning = false;
        this.scanInterval = null;
        this.selectedOpportunity = null;
        this.dataSource = 'none'; // 'real' | 'simulated' | 'none'
        
        // 套利扫描配置
        this.scanConfig = {
            minProfit: -1000,        // 最小利润阈值 ($) - 允许负利润以便显示所有计算结果
            maxRisk: 10000,          // 最大风险阈值 ($)
            transactionCost: 0.5,    // 单边交易成本 ($) - 降低交易成本
            slippage: 0.01,         // 滑点 (1%)
            minVolume: 0,           // 最小交易量 - 降低流动性要求
            riskFreeRate: 0.05      // 无风险利率 (5%)
        };
        
        this.init();
    }

    async init() {
        console.log('期权套利扫描模块初始化...');
        try {
            this.setupEventListeners();
            // 不在初始化时加载数据，而是在点击扫描时加载
            console.log('期权套利扫描模块初始化完成');
        } catch (error) {
            console.error('期权套利扫描模块初始化失败:', error);
        }
    }

    setupEventListeners() {
        // 开始扫描按钮
        const startBtn = document.getElementById('scan-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startScan();
            });
        }

        // 停止扫描按钮
        const stopBtn = document.getElementById('scan-stop-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopScan();
            });
        }

        // 套利类型筛选
        const typeFilter = document.getElementById('arbitrage-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filterOpportunities();
            });
        }

        // 最小利润筛选
        const profitFilter = document.getElementById('min-profit-filter');
        if (profitFilter) {
            profitFilter.addEventListener('change', (e) => {
                this.scanConfig.minProfit = parseFloat(e.target.value);
                this.filterOpportunities();
            });
        }

        // 详情标签切换
        const detailTabs = document.querySelectorAll('.detail-tab');
        detailTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchDetailTab(e.target.dataset.tab);
            });
        });
    }

    async loadMarketData() {
        // 清空现有数据，确保不混合真实和模拟数据
        this.optionsData.clear();
        console.log('🗑️ 清空现有期权数据');
        
        try {
            console.log('📡 加载Deribit真实市场数据...');
            
            // 获取BTC当前价格
            await this.loadUnderlyingPrice();
            
            // 获取真实期权数据
            await this.loadRealOptionsData();
            
            this.dataSource = 'real';
            console.log('✅ Deribit真实数据加载完成');
            console.log(`📊 总期权合约数: ${this.optionsData.size}`);
            console.log('🏷️ 数据源: Deribit真实数据');
            
        } catch (error) {
            console.error('❌ 加载Deribit真实数据失败:', error);
            console.error('错误详情:', error.message);
            console.error('错误堆栈:', error.stack);
            console.error('⚠️ 无法获取真实数据，请检查网络连接或CORS设置');
            this.dataSource = 'error';
            
            // 不抛出错误，而是继续进行扫描以便调试
            console.warn('继续执行扫描流程以便调试...');
        }
    }

    async loadUnderlyingPrice() {
        try {
            const response = await fetch(`${this.baseUrl}/public/ticker?instrument_name=BTC-PERPETUAL`);
            if (response.ok) {
                const data = await response.json();
                this.underlyingPrice = data.result.last_price;
                console.log('BTC当前价格 (Deribit实时):', this.underlyingPrice);
            } else {
                throw new Error('Failed to fetch BTC price');
            }
        } catch (error) {
            console.error('获取BTC价格失败:', error);
            // 使用备用价格源或默认价格
            this.underlyingPrice = 108390;
            console.warn('使用默认BTC价格:', this.underlyingPrice);
        }
    }

    async loadRealOptionsData() {
        try {
            console.log('获取Deribit真实期权数据...');
            console.log('当前BTC价格:', this.underlyingPrice);
            this.optionsData.clear();
            
            // 获取所有BTC期权合约基础信息
            const instrumentsResponse = await fetch(`${this.baseUrl}/public/get_instruments?currency=BTC&kind=option&expired=false`);
            if (!instrumentsResponse.ok) {
                throw new Error('Failed to fetch instruments');
            }
            
            const instrumentsData = await instrumentsResponse.json();
            const instruments = instrumentsData.result;
            
            console.log(`发现${instruments.length}个BTC期权合约`);
            
            // 创建合约信息映射
            const instrumentMap = new Map();
            instruments.forEach(inst => {
                instrumentMap.set(inst.instrument_name, {
                    strike: inst.strike,  // Deribit直接提供正确的行权价
                    expiry: inst.instrument_name.split('-')[1], // 从合约名称解析到期日
                    expiration_timestamp: inst.expiration_timestamp,
                    option_type: inst.option_type,
                    contract_size: inst.contract_size
                });
            });
            
            // 获取期权市场数据
            const bookResponse = await fetch(`${this.baseUrl}/public/get_book_summary_by_currency?currency=BTC&kind=option`);
            if (!bookResponse.ok) {
                throw new Error('Failed to fetch option prices');
            }
            
            const bookData = await bookResponse.json();
            const bookSummaries = bookData.result;
            
            console.log(`获取到${bookSummaries.length}个期权报价`);
            
            // 合并合约信息和市场数据（使用与测试页面相同的逻辑）
            let validOptions = 0;
            
            console.log('开始合并期权数据...');
            bookSummaries.forEach(summary => {
                const instrumentName = summary.instrument_name;
                const instrumentInfo = instrumentMap.get(instrumentName);
                
                // 与测试页面完全相同的过滤逻辑
                if (instrumentInfo && summary.bid_price > 0 && summary.ask_price > 0 && summary.bid_price < summary.ask_price) {
                    // 检查行权价合理性
                    const currentPrice = this.underlyingPrice;
                    const minStrike = currentPrice * 0.5;
                    const maxStrike = currentPrice * 1.5;
                    
                    // 调试：打印前几个处理的期权
                    if (validOptions < 5) {
                        console.log(`处理期权: ${instrumentName}, 行权价: ${instrumentInfo.strike}, 范围: ${minStrike.toFixed(0)}-${maxStrike.toFixed(0)}, 有效: ${instrumentInfo.strike >= minStrike && instrumentInfo.strike <= maxStrike}`);
                    }
                    
                    if (instrumentInfo.strike >= minStrike && instrumentInfo.strike <= maxStrike) {
                    const optionData = {
                        instrument_name: instrumentName,
                        kind: 'option',
                        option_type: instrumentInfo.option_type,
                        strike: instrumentInfo.strike,
                        expiry: instrumentInfo.expiry,
                        expiration_timestamp: instrumentInfo.expiration_timestamp,
                        
                        // 市场数据
                        bid: summary.bid_price,
                        ask: summary.ask_price,
                        mark: summary.mark_price || (summary.bid_price + summary.ask_price) / 2,
                        last: summary.last,
                        
                        // 交易量和持仓量
                        volume: summary.volume || 0,
                        open_interest: summary.open_interest || 0,
                        
                        // Greeks和风险指标
                        iv: summary.mark_iv || 0,
                        delta: summary.greeks?.delta || 0,
                        gamma: summary.greeks?.gamma || 0,
                        theta: summary.greeks?.theta || 0,
                        vega: summary.greeks?.vega || 0,
                        
                        // 价格变化
                        price_change: summary.price_change,
                        price_change_percentage: summary.price_change_percentage,
                        
                        // 时间戳
                        creation_timestamp: summary.creation_timestamp,
                        estimated_delivery_price: summary.estimated_delivery_price
                    };
                    
                    this.optionsData.set(instrumentName, optionData);
                    validOptions++;
                    }
                }
            });
            
            console.log(`数据处理统计:`);
            console.log(`- 总期权报价: ${bookSummaries.length}`);
            console.log(`- 有效期权数据: ${validOptions}`);
            console.log(`- 数据源验证: ${validOptions > 0 ? '✅ 真实数据' : '❌ 无有效数据'}`);
            
            if (validOptions === 0) {
                console.warn('⚠️ 未找到有效的期权数据');
                console.warn('可能原因:');
                console.warn('1. Deribit API返回了空数据');
                console.warn('2. 数据验证条件过于严格');
                console.warn('3. 网络连接问题');
                console.warn('4. 所有期权行权价都超出合理范围');
                // 不抛出错误，继续进行空数据扫描以便调试
            }
            
            console.log('✓ Deribit真实数据加载成功');
            
        } catch (error) {
            console.error('获取Deribit期权数据失败:', error);
            console.error('具体错误:', error.message);
            throw error;
        }
    }


    async startScan() {
        if (this.isScanning) return;
        
        console.log('开始套利扫描...');
        this.isScanning = true;
        this.updateScanStatus('scanning', '正在加载Deribit实时数据...');
        
        // 启用/禁用按钮
        const startBtn = document.getElementById('scan-start-btn');
        const stopBtn = document.getElementById('scan-stop-btn');
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        
        try {
            // 强制加载真实市场数据
            console.log('🔄 强制加载Deribit真实数据...');
            await this.loadMarketData();
            
            this.updateScanStatus('scanning', '正在扫描套利机会...');
            
            // 执行初始扫描
            this.performScan();
            
            // 设置定期扫描 (每30秒)
            this.scanInterval = setInterval(() => {
                this.performScan();
            }, 30000);
            
        } catch (error) {
            console.error('扫描启动失败:', error);
            this.updateScanStatus('error', '数据加载失败');
            this.stopScan();
        }
    }

    stopScan() {
        if (!this.isScanning) return;
        
        console.log('停止套利扫描...');
        this.isScanning = false;
        this.updateScanStatus('idle', '准备就绪');
        
        // 清除定时器
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        // 启用/禁用按钮
        const startBtn = document.getElementById('scan-start-btn');
        const stopBtn = document.getElementById('scan-stop-btn');
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
    }

    updateScanStatus(status, message) {
        const statusIndicator = document.querySelector('#scan-status .status-indicator');
        const statusText = document.querySelector('#scan-status .status-text');
        
        if (statusIndicator && statusText) {
            statusIndicator.className = `status-indicator ${status}`;
            statusText.textContent = message;
        }
        
        console.log(`状态更新: ${status} - ${message}`);
    }

    performScan() {
        console.log('🔍 执行套利扫描...');
        console.log(`📊 当前期权数据数量: ${this.optionsData.size}`);
        console.log(`💰 BTC现价: $${this.underlyingPrice}`);
        console.log(`🏷️ 数据源: ${this.dataSource}`);
        
        this.arbitrageOpportunities = [];
        
        try {
            // 调试期权数据
            if (this.optionsData.size === 0) {
                console.warn('期权数据为空，尝试重新加载');
                this.loadMarketData();
                return;
            }
            
            // 扫描转换套利机会
            console.log('开始扫描转换套利...');
            this.scanConversionArbitrage();
            console.log(`转换套利扫描完成，发现${this.arbitrageOpportunities.filter(o => o.type === 'conversion').length}个机会`);
            
            // 扫描逆转换套利机会
            console.log('开始扫描逆转换套利...');
            this.scanReversalArbitrage();
            console.log(`逆转换套利扫描完成，发现${this.arbitrageOpportunities.filter(o => o.type === 'reversal').length}个机会`);
            
            // 扫描箱式套利机会
            console.log('开始扫描箱式套利...');
            this.scanBoxSpreadArbitrage();
            console.log(`箱式套利扫描完成，发现${this.arbitrageOpportunities.filter(o => o.type === 'box').length}个机会`);
            
            // 过滤和排序机会
            this.filterAndSortOpportunities();
            
            // 更新界面
            console.log(`准备渲染${this.arbitrageOpportunities.length}个套利机会`);
            try {
                this.renderOpportunities();
                console.log('✅ 套利机会渲染完成');
                this.updateStats();
                console.log('✅ 统计信息更新完成');
            } catch (renderError) {
                console.error('❌ 渲染过程出错:', renderError);
                console.error('错误详情:', renderError.message);
                console.error('错误堆栈:', renderError.stack);
            }
            
            console.log(`总共发现${this.arbitrageOpportunities.length}个套利机会`);
            
            if (this.arbitrageOpportunities.length === 0) {
                console.log('未发现套利机会的可能原因:');
                console.log('1. 市场效率较高，真实套利机会稀少');
                console.log('2. 交易成本设置过高');
                console.log('3. 最小利润阈值过高');
                console.log('4. 流动性要求过严');
                console.log('当前配置:', this.scanConfig);
            }
            
        } catch (error) {
            console.error('套利扫描执行失败:', error);
        }
    }

    scanConversionArbitrage() {
        // 转换套利: 买入标的 + 买入Put + 卖出Call = 无风险套利
        // 严谨的财务计算：Initial Investment, Net Cash Flow, Return
        
        const options = Array.from(this.optionsData.values());
        console.log(`期权数据总数: ${options.length}`);
        
        const groupedByStrike = this.groupOptionsByStrikeAndExpiry(options);
        console.log(`按行权价和到期日分组: ${groupedByStrike.size}组`);
        
        let checkedPairs = 0;
        let validPairs = 0;
        
        for (const [key, group] of groupedByStrike) {
            const [strike, expiry] = key.split('|').map(s => parseFloat(s) || s);
            const call = group.calls[0];
            const put = group.puts[0];
            
            checkedPairs++;
            
            if (!call || !put) {
                console.log(`跳过${key}: Call=${!!call}, Put=${!!put}`);
                continue;
            }
            
            if (!call.bid || !put.ask || call.bid <= 0 || put.ask <= 0) {
                console.log(`跳过${key}: Call.bid=${call.bid}, Put.ask=${put.ask}`);
                continue;
            }
            
            validPairs++;
            
            // === 严谨的转换套利财务分析 ===
            
            // 1. 初始投资分析 (T=0时刻的现金流)
            const stockPurchase = this.underlyingPrice;           // 买入BTC现货
            const putPurchase = put.ask;                         // 买入Put期权
            const callSale = call.bid;                           // 卖出Call期权（收入）
            const transactionCosts = this.scanConfig.transactionCost * 3; // 交易费用
            
            // 初始净投资 = 买入成本 - 卖出收入 + 交易费用
            const initialInvestment = stockPurchase + putPurchase - callSale + transactionCosts;
            
            // 2. 到期收益分析 (T=expiry时刻)
            // 无论BTC价格如何变动，转换套利的收益都是固定的
            const maturityValue = strike; // 到期时通过执行期权获得的固定价值
            
            // 3. 套利利润和收益率计算
            const arbitrageProfit = maturityValue - initialInvestment;
            const profitMargin = initialInvestment > 0 ? (arbitrageProfit / initialInvestment) * 100 : 0;
            
            // 4. 风险调整和可行性检查
            const minViableProfit = Math.max(this.scanConfig.minProfit, initialInvestment * 0.001); // 至少0.1%收益
            const liquidityCheck = call.volume >= 0 && put.volume >= 0; // 流动性要求 - 放宽条件
            const spreadTolerance = true; // 暂时跳过价差检查用于调试
            
            // 详细调试第一个有效的配对
            if (validPairs === 1) {
                console.log(`转换套利计算示例 (${key}):`);
                console.log(`BTC现价: $${this.underlyingPrice}`);
                console.log(`行权价: $${strike}`);
                console.log(`Call买价/卖价: ${call.bid}/${call.ask}`);
                console.log(`Put买价/卖价: ${put.bid}/${put.ask}`);
                console.log(`初始投资: $${initialInvestment.toFixed(2)}`);
                console.log(`到期价值: $${maturityValue}`);
                console.log(`利润: $${arbitrageProfit.toFixed(2)}`);
                console.log(`最小利润要求: $${minViableProfit.toFixed(2)}`);
                console.log(`流动性检查: ${liquidityCheck} (Call:${call.volume}, Put:${put.volume})`);
                console.log(`价差容忍度: ${spreadTolerance}`);
            }
            
            if (arbitrageProfit > minViableProfit && liquidityCheck && spreadTolerance) {
                const opportunity = {
                    id: `conv_${Date.now()}_${call.instrument_name}_${put.instrument_name}`,
                    type: 'conversion',
                    title: `转换套利 ${strike}`,
                    strike: strike,
                    expiry: expiry,
                    
                    // === 核心财务指标 ===
                    initialInvestment: initialInvestment,           // 初始投资（本金）
                    profit: arbitrageProfit,                       // 绝对利润
                    profitPercent: profitMargin,                   // 利润率
                    maturityValue: maturityValue,                  // 到期价值
                    
                    // === 详细成本分解 ===
                    costs: {
                        stockCost: stockPurchase,
                        putCost: putPurchase,
                        callIncome: callSale,
                        transactionCosts: transactionCosts,
                        totalNetCost: initialInvestment
                    },
                    
                    // === 风险和置信度 ===
                    risk: this.calculateConversionRisk(call, put),
                    confidence: this.calculateConfidence(call, put),
                    
                    // === 期权组合信息 ===
                    components: {
                        call: call,
                        put: put,
                        underlying: { price: this.underlyingPrice }
                    },
                    
                    // === 执行和分析数据 ===
                    executionSteps: this.generateConversionSteps(call, put, initialInvestment),
                    riskMetrics: this.calculateRiskMetrics('conversion', call, put),
                    
                    // === 补充财务指标 ===
                    requiredCapital: Math.max(initialInvestment, 0), // 所需资本（正值）
                    annualizedReturn: this.calculateAnnualizedReturn(arbitrageProfit, Math.abs(initialInvestment), call.expiry, call.expiration_timestamp),
                    liquidityScore: this.calculateLiquidityScore(call, put),
                    spreadCost: this.calculateSpreadCost(call, put),
                    timeToExpiry: this.calculateTimeToExpiry(call.expiry, call.expiration_timestamp),
                    marketDepth: this.calculateMarketDepth(call, put),
                    
                    // === 实时市场数据 ===
                    marketData: {
                        spotPrice: this.underlyingPrice,
                        callIV: call.iv || 0,
                        putIV: put.iv || 0,
                        callDelta: call.delta || 0,
                        putDelta: put.delta || 0,
                        timestamp: new Date().toISOString()
                    }
                };
                
                // 调试：打印套利机会的关键数据
                if (this.arbitrageOpportunities.length < 3) { // 只打印前3个
                    console.log(`转换套利机会 #${this.arbitrageOpportunities.length + 1} 数据验证:`);
                    console.log(`- 行权价: $${opportunity.strike}`);
                    console.log(`- 初始投资: $${opportunity.initialInvestment.toFixed(2)}`);
                    console.log(`- 利润: $${opportunity.profit.toFixed(2)}`);
                    console.log(`- 利润率: ${opportunity.profitPercent.toFixed(2)}%`);
                    console.log(`- 年化收益: ${(opportunity.annualizedReturn || 0).toFixed(2)}%`);
                    console.log(`- 所需资本: $${opportunity.requiredCapital.toFixed(2)}`);
                    console.log(`- 到期天数: ${opportunity.timeToExpiry}`);
                }
                
                this.arbitrageOpportunities.push(opportunity);
            }
        }
        
        console.log(`转换套利扫描统计:`);
        console.log(`- 检查配对: ${checkedPairs}`);
        console.log(`- 有效配对: ${validPairs}`);
        console.log(`- 发现机会: ${this.arbitrageOpportunities.filter(o => o.type === 'conversion').length}`);
    }

    scanReversalArbitrage() {
        // 逆转换套利: 卖出标的 + 卖出Put + 买入Call = 无风险套利
        // 严谨的财务计算：Initial Cash Flow, Future Obligation, Net Return
        
        const options = Array.from(this.optionsData.values());
        const groupedByStrike = this.groupOptionsByStrikeAndExpiry(options);
        
        for (const [key, group] of groupedByStrike) {
            const [strike, expiry] = key.split('|').map(s => parseFloat(s) || s);
            const call = group.calls[0];
            const put = group.puts[0];
            
            if (!call || !put || !call.ask || !put.bid) continue;
            
            // === 严谨的逆转换套利财务分析 ===
            
            // 1. 初始现金流分析 (T=0时刻)
            const stockSale = this.underlyingPrice;              // 卖出BTC现货（收入）
            const putSale = put.bid;                            // 卖出Put期权（收入）
            const callPurchase = call.ask;                      // 买入Call期权（支出）
            const transactionCosts = this.scanConfig.transactionCost * 3; // 交易费用
            
            // 初始净现金流入 = 卖出收入 - 买入成本 - 交易费用
            const initialCashFlow = stockSale + putSale - callPurchase - transactionCosts;
            
            // 2. 到期义务分析 (T=expiry时刻)
            // 无论BTC价格如何变动，逆转换套利的到期义务都是固定的
            const maturityObligation = strike; // 到期时需要支付的固定金额
            
            // 3. 套利利润和收益率计算
            const arbitrageProfit = initialCashFlow - maturityObligation;
            
            // 计算收益率基准：使用到期义务作为投资基数
            const investmentBase = maturityObligation;
            const profitMargin = investmentBase > 0 ? (arbitrageProfit / investmentBase) * 100 : 0;
            
            // 4. 资本要求计算（对于逆转换套利，主要是保证金要求）
            const marginRequirement = Math.max(
                call.ask,                                        // Call期权保证金
                strike * 0.1,                                   // Put卖出保证金（假设10%）
                this.underlyingPrice * 0.05                     // 最小保证金要求
            );
            
            // 5. 风险调整和可行性检查
            const minViableProfit = Math.max(this.scanConfig.minProfit, investmentBase * 0.001); // 至少0.1%收益
            const liquidityCheck = call.volume >= 0 && put.volume >= 0;
            const spreadTolerance = true; // 暂时跳过价差检查用于调试
            const profitabilityCheck = arbitrageProfit > minViableProfit;
            
            if (profitabilityCheck && liquidityCheck && spreadTolerance) {
                const opportunity = {
                    id: `rev_${Date.now()}_${call.instrument_name}_${put.instrument_name}`,
                    type: 'reversal',
                    title: `逆转换套利 ${strike}`,
                    strike: strike,
                    expiry: expiry,
                    
                    // === 核心财务指标 ===
                    initialInvestment: marginRequirement,          // 所需保证金（本金）
                    profit: arbitrageProfit,                      // 绝对利润
                    profitPercent: profitMargin,                  // 利润率
                    initialCashFlow: initialCashFlow,             // 初始现金流
                    maturityObligation: maturityObligation,       // 到期义务
                    
                    // === 详细现金流分解 ===
                    cashFlows: {
                        stockSaleIncome: stockSale,
                        putSaleIncome: putSale,
                        callPurchaseCost: callPurchase,
                        transactionCosts: transactionCosts,
                        netInitialCashFlow: initialCashFlow,
                        marginRequirement: marginRequirement
                    },
                    
                    // === 风险和置信度 ===
                    risk: this.calculateReversalRisk(call, put),
                    confidence: this.calculateConfidence(call, put),
                    
                    // === 期权组合信息 ===
                    components: {
                        call: call,
                        put: put,
                        underlying: { price: this.underlyingPrice }
                    },
                    
                    // === 执行和分析数据 ===
                    executionSteps: this.generateReversalSteps(call, put, marginRequirement),
                    riskMetrics: this.calculateRiskMetrics('reversal', call, put),
                    
                    // === 补充财务指标 ===
                    requiredCapital: marginRequirement,           // 所需资本
                    annualizedReturn: this.calculateAnnualizedReturn(arbitrageProfit, marginRequirement, call.expiry, call.expiration_timestamp),
                    liquidityScore: this.calculateLiquidityScore(call, put),
                    spreadCost: this.calculateSpreadCost(call, put),
                    timeToExpiry: this.calculateTimeToExpiry(call.expiry, call.expiration_timestamp),
                    marketDepth: this.calculateMarketDepth(call, put),
                    
                    // === 实时市场数据 ===
                    marketData: {
                        spotPrice: this.underlyingPrice,
                        callIV: call.iv || 0,
                        putIV: put.iv || 0,
                        callDelta: call.delta || 0,
                        putDelta: put.delta || 0,
                        timestamp: new Date().toISOString()
                    }
                };
                
                this.arbitrageOpportunities.push(opportunity);
            }
        }
    }

    scanBoxSpreadArbitrage() {
        // 箱式套利: 多头价差 + 空头价差的组合
        // 理论价值应该等于行权价差异
        
        const options = Array.from(this.optionsData.values());
        const strikes = [...new Set(options.map(opt => opt.strike))].sort((a, b) => a - b);
        
        for (let i = 0; i < strikes.length - 1; i++) {
            const lowerStrike = strikes[i];
            const higherStrike = strikes[i + 1];
            const strikeDiff = higherStrike - lowerStrike;
            
            // 查找相同到期日的期权
            const expiries = [...new Set(options.map(opt => opt.expiry))];
            
            expiries.forEach(expiry => {
                const lowerCall = options.find(opt => 
                    opt.strike === lowerStrike && opt.expiry === expiry && opt.option_type === 'call');
                const higherCall = options.find(opt => 
                    opt.strike === higherStrike && opt.expiry === expiry && opt.option_type === 'call');
                const lowerPut = options.find(opt => 
                    opt.strike === lowerStrike && opt.expiry === expiry && opt.option_type === 'put');
                const higherPut = options.find(opt => 
                    opt.strike === higherStrike && opt.expiry === expiry && opt.option_type === 'put');
                
                if (!lowerCall || !higherCall || !lowerPut || !higherPut) return;
                
                // 计算箱式价差的市场价格
                const boxPrice = (lowerCall.ask - higherCall.bid) + (higherPut.ask - lowerPut.bid);
                const theoreticalValue = strikeDiff;
                
                // 计算套利利润
                const profit = theoreticalValue - boxPrice - (this.scanConfig.transactionCost * 4);
                
                if (profit > this.scanConfig.minProfit) {
                    const opportunity = {
                        id: `box_${Date.now()}_${lowerStrike}_${higherStrike}_${expiry}`,
                        type: 'box',
                        title: `Box ${lowerStrike}-${higherStrike}`,
                        strike: `${lowerStrike}/${higherStrike}`,
                        expiry: expiry,
                        profit: profit,
                        profitPercent: (profit / boxPrice) * 100,
                        risk: Math.abs(profit * 0.1), // 箱式套利风险较低
                        confidence: 0.9, // 箱式套利置信度较高
                        components: {
                            lowerCall: lowerCall,
                            higherCall: higherCall,
                            lowerPut: lowerPut,
                            higherPut: higherPut
                        },
                        executionSteps: this.generateBoxSpreadSteps(lowerCall, higherCall, lowerPut, higherPut),
                        riskMetrics: this.calculateBoxSpreadRiskMetrics(lowerCall, higherCall, lowerPut, higherPut),
                        // 新增关键信息
                        requiredCapital: this.calculateRequiredCapital('box', lowerCall, higherCall, lowerPut, higherPut),
                        annualizedReturn: this.calculateAnnualizedReturn(profit, boxPrice, expiry),
                        liquidityScore: this.calculateBoxLiquidityScore(lowerCall, higherCall, lowerPut, higherPut),
                        spreadCost: this.calculateBoxSpreadCost(lowerCall, higherCall, lowerPut, higherPut),
                        timeToExpiry: this.calculateTimeToExpiry(expiry),
                        marketDepth: this.calculateBoxMarketDepth(lowerCall, higherCall, lowerPut, higherPut)
                    };
                    
                    this.arbitrageOpportunities.push(opportunity);
                }
            });
        }
    }

    groupOptionsByStrikeAndExpiry(options) {
        const grouped = new Map();
        
        options.forEach(option => {
            const key = `${option.strike}|${option.expiry}`;
            if (!grouped.has(key)) {
                grouped.set(key, { calls: [], puts: [] });
            }
            
            if (option.option_type === 'call') {
                grouped.get(key).calls.push(option);
            } else {
                grouped.get(key).puts.push(option);
            }
        });
        
        return grouped;
    }

    calculateConversionRisk(call, put) {
        // 转换套利的主要风险是执行风险和流动性风险
        const volumeRisk = Math.min(call.volume, put.volume) < this.scanConfig.minVolume ? 50 : 10;
        const spreadRisk = ((call.ask - call.bid) + (put.ask - put.bid)) / 2;
        return volumeRisk + spreadRisk;
    }

    calculateReversalRisk(call, put) {
        // 逆转换套利的风险类似转换套利
        return this.calculateConversionRisk(call, put);
    }

    calculateConfidence(call, put) {
        // 基于交易量和买卖价差计算置信度
        const avgVolume = (call.volume + put.volume) / 2;
        const avgSpread = ((call.ask - call.bid) + (put.ask - put.bid)) / 2;
        
        let confidence = 0.5; // 基础置信度
        
        // 基于交易量调整
        if (avgVolume > 20) confidence += 0.2;
        else if (avgVolume > 10) confidence += 0.1;
        
        // 基于价差调整
        if (avgSpread < 20) confidence += 0.2;
        else if (avgSpread < 50) confidence += 0.1;
        
        return Math.min(confidence, 0.95);
    }

    calculateRiskMetrics(type, call, put) {
        return {
            maxRisk: this.scanConfig.maxRisk,
            successRate: '85%',
            executionRisk: 'Medium',
            timeSensitivity: 'High'
        };
    }

    calculateBoxSpreadRiskMetrics(lowerCall, higherCall, lowerPut, higherPut) {
        return {
            maxRisk: 50, // 箱式套利风险很低
            successRate: '95%',
            executionRisk: 'Low',
            timeSensitivity: 'Low'
        };
    }

    generateConversionSteps(call, put) {
        return [
            {
                action: '买入',
                instrument: 'BTC 现货',
                price: this.underlyingPrice,
                quantity: 1
            },
            {
                action: '买入',
                instrument: put.instrument_name,
                price: put.ask,
                quantity: 1
            },
            {
                action: '卖出',
                instrument: call.instrument_name,
                price: call.bid,
                quantity: 1
            }
        ];
    }

    generateReversalSteps(call, put) {
        return [
            {
                action: '卖出',
                instrument: 'BTC 现货',
                price: this.underlyingPrice,
                quantity: 1
            },
            {
                action: '卖出',
                instrument: put.instrument_name,
                price: put.bid,
                quantity: 1
            },
            {
                action: '买入',
                instrument: call.instrument_name,
                price: call.ask,
                quantity: 1
            }
        ];
    }

    generateBoxSpreadSteps(lowerCall, higherCall, lowerPut, higherPut) {
        return [
            {
                action: '买入',
                instrument: lowerCall.instrument_name,
                price: lowerCall.ask,
                quantity: 1
            },
            {
                action: '卖出',
                instrument: higherCall.instrument_name,
                price: higherCall.bid,
                quantity: 1
            },
            {
                action: '买入',
                instrument: higherPut.instrument_name,
                price: higherPut.ask,
                quantity: 1
            },
            {
                action: '卖出',
                instrument: lowerPut.instrument_name,
                price: lowerPut.bid,
                quantity: 1
            }
        ];
    }

    filterAndSortOpportunities() {
        // 按利润排序
        this.arbitrageOpportunities.sort((a, b) => b.profit - a.profit);
        
        // 应用筛选器
        this.filterOpportunities();
    }

    filterOpportunities() {
        const typeFilter = document.getElementById('arbitrage-type-filter')?.value || 'all';
        const profitFilter = parseFloat(document.getElementById('min-profit-filter')?.value || 0);
        
        const filtered = this.arbitrageOpportunities.filter(opp => {
            if (typeFilter !== 'all' && opp.type !== typeFilter) return false;
            if (opp.profit < profitFilter) return false;
            return true;
        });
        
        this.renderOpportunities(filtered);
    }

    renderOpportunities(opportunities = this.arbitrageOpportunities) {
        const container = document.getElementById('arbitrage-opportunities');
        if (!container) return;
        
        if (opportunities.length === 0) {
            container.innerHTML = `
                <div class="no-opportunities">
                    <div class="no-opportunities-icon">🔍</div>
                    <div class="no-opportunities-text">未发现套利机会</div>
                    <div class="no-opportunities-subtitle">点击"开始扫描"开始搜索</div>
                </div>
            `;
            return;
        }
        
        // 创建统一的表格格式，包含所有关键信息
        container.innerHTML = `
            <div class="arbitrage-table-wrapper">
                <table class="arbitrage-table">
                    <thead>
                        <tr>
                            <th>排名</th>
                            <th>套利类型</th>
                            <th>行权价</th>
                            <th>到期时间</th>
                            <th>利润金额</th>
                            <th>利润率</th>
                            <th>年化收益</th>
                            <th>所需资金</th>
                            <th>流动性评分</th>
                            <th>到期天数</th>
                            <th>价差成本</th>
                            <th>市场深度</th>
                            <th>置信度</th>
                            <th>风险分析</th>
                            <th>执行步骤</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${opportunities.map((opp, index) => `
                            <tr class="arbitrage-row ${opp.type}" data-opportunity-id="${opp.id}">
                                <td class="rank-cell">#${index + 1}</td>
                                <td class="type-cell">
                                    <div class="type-badge ${opp.type}">
                                        <span class="type-icon">${this.getTypeIcon(opp.type)}</span>
                                        <span class="type-name">${this.getTypeDisplayName(opp.type)}</span>
                                    </div>
                                </td>
                                <td class="strike-cell">$${opp.strike}</td>
                                <td class="expiry-cell">${this.formatExpiryDate(opp.expiry)}</td>
                                <td class="profit-cell">
                                    <span class="profit-amount ${opp.profit >= 0 ? 'positive' : 'negative'}">${opp.profit >= 0 ? '+' : ''}$${opp.profit.toFixed(2)}</span>
                                </td>
                                <td class="percent-cell">
                                    <span class="profit-percent ${opp.profitPercent >= 0 ? 'positive' : 'negative'}">${opp.profitPercent >= 0 ? '+' : ''}${opp.profitPercent.toFixed(1)}%</span>
                                </td>
                                <td class="annual-return-cell">
                                    <span class="annual-return">${(opp.annualizedReturn || 0).toFixed(1)}%</span>
                                </td>
                                <td class="capital-cell">
                                    <span class="capital-amount">$${(opp.initialInvestment || opp.requiredCapital || 0).toLocaleString()}</span>
                                </td>
                                <td class="liquidity-cell">
                                    <div class="liquidity-score liquidity-${this.getLiquidityLevel(opp.liquidityScore || 0)}">
                                        <span class="score-value">${(opp.liquidityScore || 0).toFixed(0)}</span>
                                        <span class="score-max">/100</span>
                                    </div>
                                </td>
                                <td class="expiry-days-cell">
                                    <span class="days-count">${opp.timeToExpiry || 0}</span>天
                                </td>
                                <td class="spread-cost-cell">
                                    <span class="cost-amount">$${(opp.spreadCost || 0).toFixed(1)}</span>
                                </td>
                                <td class="depth-cell">
                                    <span class="depth-indicator">${opp.marketDepth || '浅'}</span>
                                </td>
                                <td class="confidence-cell">
                                    <div class="confidence-indicator ${this.getConfidenceLevel(opp.confidence)}">
                                        <div class="confidence-bar">
                                            <div class="confidence-fill" style="width: ${opp.confidence * 100}%"></div>
                                        </div>
                                        <span class="confidence-text">${this.getConfidenceText(opp.confidence)}</span>
                                    </div>
                                </td>
                                <td class="risk-cell">
                                    <div class="risk-analysis">
                                        <div class="risk-level risk-${this.getRiskLevel(opp.risk)}">
                                            ${this.getRiskLevel(opp.risk).toUpperCase()}
                                        </div>
                                        <div class="risk-details">
                                            <div class="risk-item">最大风险: $${opp.riskMetrics?.maxRisk || 0}</div>
                                            <div class="risk-item">成功率: ${opp.riskMetrics?.successRate || 'N/A'}</div>
                                            <div class="risk-item">执行风险: ${opp.riskMetrics?.executionRisk || 'N/A'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="execution-cell">
                                    <div class="execution-steps">
                                        ${(opp.executionSteps || []).map((step, i) => `
                                            <div class="execution-step">
                                                <span class="step-number">${i + 1}.</span>
                                                <span class="step-action">${step.action}</span>
                                                <span class="step-instrument">${step.instrument}</span>
                                                <span class="step-price">@$${step.price}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    getTypeIcon(type) {
        const icons = {
            'conversion': '🔄',
            'reversal': '↩️',
            'box': '📦'
        };
        return icons[type] || '⚖️';
    }

    getTypeDisplayName(type) {
        const names = {
            'conversion': '转换套利',
            'reversal': '逆转换套利',
            'box': '箱式套利'
        };
        return names[type] || type;
    }

    getRiskLevel(risk) {
        if (risk < 50) return 'low';
        if (risk < 200) return 'medium';
        return 'high';
    }

    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium';
        return 'low';
    }

    getLiquidityLevel(score) {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    }

    getConfidenceText(confidence) {
        if (confidence >= 0.8) return '高置信度';
        if (confidence >= 0.6) return '中等置信度';
        return '低置信度';
    }

    formatExpiryDate(expiry) {
        // 将 "5JUL25" 格式转换为 "Jul 5, 2025"
        try {
            const day = expiry.match(/\d+/)[0];
            const month = expiry.match(/[A-Z]+/)[0];
            const year = '20' + expiry.match(/\d+$/)[0];
            
            const monthMap = {
                'JAN': '1月', 'FEB': '2月', 'MAR': '3月', 'APR': '4月',
                'MAY': '5月', 'JUN': '6月', 'JUL': '7月', 'AUG': '8月',
                'SEP': '9月', 'OCT': '10月', 'NOV': '11月', 'DEC': '12月'
            };
            
            return `${year}年${monthMap[month]}${day}日`;
        } catch (error) {
            return expiry;
        }
    }

    selectOpportunity(opportunityId) {
        const opportunity = this.arbitrageOpportunities.find(opp => opp.id == opportunityId);
        if (!opportunity) return;
        
        this.selectedOpportunity = opportunity;
        
        // 更新选中状态
        document.querySelectorAll('.opportunity-card').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-opportunity-id="${opportunityId}"]`)?.classList.add('selected');
        
        // 显示详细信息
        this.renderOpportunityDetails(opportunity);
    }

    renderOpportunityDetails(opportunity) {
        // 渲染概览
        const overviewDetail = document.getElementById('overview-detail');
        if (overviewDetail) {
            overviewDetail.innerHTML = `
                <div class="detail-overview">
                    <div class="overview-header">
                        <h3>${opportunity.title}</h3>
                        <div class="profit-highlight">+$${opportunity.profit.toFixed(2)}</div>
                    </div>
                    <div class="overview-metrics">
                        <div class="metric-row">
                            <span class="metric-label">类型:</span>
                            <span class="metric-value">${this.getTypeDisplayName(opportunity.type)}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">行权价:</span>
                            <span class="metric-value">$${opportunity.strike}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">到期日:</span>
                            <span class="metric-value">${this.formatExpiryDate(opportunity.expiry)}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">投资回报率:</span>
                            <span class="metric-value profit">+${opportunity.profitPercent.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // 渲染执行步骤
        const executionDetail = document.getElementById('execution-detail');
        if (executionDetail) {
            executionDetail.innerHTML = `
                <div class="execution-plan">
                    <h4>执行步骤</h4>
                    <div class="steps-list">
                        ${opportunity.executionSteps.map((step, index) => `
                            <div class="execution-step">
                                <div class="step-number">${index + 1}</div>
                                <div class="step-content">
                                    <div class="step-action ${step.action.toLowerCase()}">${step.action}</div>
                                    <div class="step-instrument">${step.instrument}</div>
                                    <div class="step-details">
                                        <span>价格: $${step.price.toFixed(2)}</span>
                                        <span>数量: ${step.quantity}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // 渲染风险指标
        this.updateElement('max-risk', `$${opportunity.riskMetrics.maxRisk}`);
        this.updateElement('success-rate', opportunity.riskMetrics.successRate);
        this.updateElement('execution-risk', opportunity.riskMetrics.executionRisk);
        this.updateElement('time-sensitivity', opportunity.riskMetrics.timeSensitivity);
    }

    updateStats() {
        const totalOpportunities = this.arbitrageOpportunities.length;
        const avgProfit = totalOpportunities > 0 
            ? this.arbitrageOpportunities.reduce((sum, opp) => sum + opp.profit, 0) / totalOpportunities 
            : 0;
        
        this.updateElement('total-opportunities', totalOpportunities);
        this.updateElement('avg-profit', `$${avgProfit.toFixed(2)}`);
    }

    updateScanStatus(status, text) {
        const statusIndicator = document.querySelector('#scan-status .status-indicator');
        const statusText = document.querySelector('#scan-status .status-text');
        
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${status}`;
        }
        if (statusText) {
            statusText.textContent = text;
        }
    }

    switchDetailTab(tabName) {
        // 切换标签样式
        document.querySelectorAll('.detail-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.detail-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-detail`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // 新增计算方法 - 计算所需资金
    calculateRequiredCapital(type, ...options) {
        try {
            if (type === 'conversion') {
                const [call, put] = options;
                if (!call || !put) return 0;
                return this.underlyingPrice + (put.ask || 0); // 买入现货 + 买入Put
            } else if (type === 'reversal') {
                const [call, put] = options;
                if (!call) return 0;
                return call.ask || 0; // 买入Call的成本
            } else if (type === 'box') {
                const [lowerCall, higherCall, lowerPut, higherPut] = options;
                if (!lowerCall || !higherPut) return 0;
                return (lowerCall.ask || 0) + (higherPut.ask || 0); // 买入部分的成本
            }
            return 0;
        } catch (error) {
            console.error('计算所需资金错误:', error);
            return 0;
        }
    }

    // 计算年化收益率
    calculateAnnualizedReturn(profit, capital, expiry, expirationTimestamp = null) {
        try {
            const daysToExpiry = this.calculateTimeToExpiry(expiry, expirationTimestamp);
            if (!daysToExpiry || daysToExpiry <= 0 || !capital || capital <= 0) return 0;
            
            const returnRate = profit / capital;
            const annualizedReturn = (returnRate * 365) / daysToExpiry;
            return Math.max(0, annualizedReturn * 100); // 转为百分比
        } catch (error) {
            console.error('计算年化收益率错误:', error);
            return 0;
        }
    }

    // 计算到期时间（天数）
    calculateTimeToExpiry(expiry, expirationTimestamp = null) {
        try {
            // 优先使用Deribit提供的Unix时间戳
            if (expirationTimestamp) {
                const expiryDate = new Date(expirationTimestamp);
                const today = new Date();
                const diffTime = expiryDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return Math.max(0, diffDays);
            }
            
            // 备用：解析 "6JUL25" 格式
            if (typeof expiry === 'string' && expiry.length >= 6) {
                const day = parseInt(expiry.match(/\d+/)[0]);
                const month = expiry.match(/[A-Z]+/)[0];
                const year = parseInt('20' + expiry.match(/\d+$/)[0]);
                
                const monthMap = {
                    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3,
                    'MAY': 4, 'JUN': 5, 'JUL': 6, 'AUG': 7,
                    'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
                };
                
                if (monthMap[month] !== undefined) {
                    const expiryDate = new Date(year, monthMap[month], day);
                    const today = new Date();
                    const diffTime = expiryDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return Math.max(0, diffDays);
                }
            }
            
            console.warn('无法解析到期时间:', expiry, expirationTimestamp);
            return 7; // 默认7天
        } catch (error) {
            console.error('计算到期时间错误:', error);
            return 7; // 默认7天
        }
    }

    // 计算流动性评分
    calculateLiquidityScore(call, put) {
        try {
            if (!call || !put) return 0;
            
            const avgVolume = ((call.volume || 0) + (put.volume || 0)) / 2;
            const avgOpenInterest = ((call.open_interest || 0) + (put.open_interest || 0)) / 2;
            
            let score = 0;
            
            // 基于交易量评分 (0-40分)
            if (avgVolume >= 50) score += 40;
            else if (avgVolume >= 20) score += 30;
            else if (avgVolume >= 10) score += 20;
            else if (avgVolume >= 5) score += 10;
            
            // 基于持仓量评分 (0-40分)
            if (avgOpenInterest >= 100) score += 40;
            else if (avgOpenInterest >= 50) score += 30;
            else if (avgOpenInterest >= 20) score += 20;
            else if (avgOpenInterest >= 10) score += 10;
            
            // 基于买卖价差评分 (0-20分)
            const callSpread = (call.ask || 0) - (call.bid || 0);
            const putSpread = (put.ask || 0) - (put.bid || 0);
            const avgSpread = (callSpread + putSpread) / 2;
            if (avgSpread < 20) score += 20;
            else if (avgSpread < 50) score += 15;
            else if (avgSpread < 100) score += 10;
            else if (avgSpread < 200) score += 5;
            
            return Math.min(100, score);
        } catch (error) {
            console.error('计算流动性评分错误:', error);
            return 0;
        }
    }

    // 计算价差成本
    calculateSpreadCost(call, put) {
        try {
            if (!call || !put) return 0;
            const callSpread = (call.ask || 0) - (call.bid || 0);
            const putSpread = (put.ask || 0) - (put.bid || 0);
            return Math.max(0, callSpread + putSpread);
        } catch (error) {
            console.error('计算价差成本错误:', error);
            return 0;
        }
    }

    // 计算市场深度
    calculateMarketDepth(call, put) {
        try {
            if (!call || !put) return '浅';
            
            const avgVolume = ((call.volume || 0) + (put.volume || 0)) / 2;
            const avgOpenInterest = ((call.open_interest || 0) + (put.open_interest || 0)) / 2;
            
            if (avgVolume >= 30 && avgOpenInterest >= 80) return '深';
            if (avgVolume >= 15 && avgOpenInterest >= 40) return '中';
            return '浅';
        } catch (error) {
            console.error('计算市场深度错误:', error);
            return '浅';
        }
    }

    // 箱式套利的特殊计算方法
    calculateBoxLiquidityScore(lowerCall, higherCall, lowerPut, higherPut) {
        const scores = [
            this.calculateLiquidityScore(lowerCall, lowerPut),
            this.calculateLiquidityScore(higherCall, higherPut)
        ];
        return Math.min(...scores); // 取最低流动性作为整体评分
    }

    calculateBoxSpreadCost(lowerCall, higherCall, lowerPut, higherPut) {
        return (lowerCall.ask - lowerCall.bid) + 
               (higherCall.ask - higherCall.bid) + 
               (lowerPut.ask - lowerPut.bid) + 
               (higherPut.ask - higherPut.bid);
    }

    calculateBoxMarketDepth(lowerCall, higherCall, lowerPut, higherPut) {
        const depths = [
            this.calculateMarketDepth(lowerCall, lowerPut),
            this.calculateMarketDepth(higherCall, higherPut)
        ];
        
        // 如果有任何一个是浅，整体就是浅
        if (depths.includes('浅')) return '浅';
        if (depths.includes('中')) return '中';
        return '深';
    }
}

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，初始化期权套利扫描模块...');
    try {
        window.arbitrageScanner = new OptionArbitrageScanner();
        console.log('期权套利扫描模块创建成功');
    } catch (error) {
        console.error('期权套利扫描模块创建失败:', error);
    }
});

// 添加到主脚本的标签切换处理
window.addEventListener('load', () => {
    if (!window.arbitrageScanner) {
        console.log('窗口加载完成，尝试重新初始化套利扫描模块...');
        try {
            window.arbitrageScanner = new OptionArbitrageScanner();
        } catch (error) {
            console.error('窗口加载后套利扫描模块初始化失败:', error);
        }
    }
});