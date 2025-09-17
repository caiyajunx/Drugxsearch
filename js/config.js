// js/config.js
const configManager = {
    save(config) {
        localStorage.setItem('aiSearchConfigV2', JSON.stringify(config));
    },

    load() {
        // 默认配置结构
        const defaultConfig = {
            tavilyKey: '',
            jinaKey: '',
            googleCse: [],
            aiRole: '药物研发',
            aiEndpoints: [], // 存储所有AI模型配置
            aiAssignments: { // 分配特定任务给哪个AI
                plan: null,
                filter: null,
                synthesize: null
            }
        };

        const configStr = localStorage.getItem('aiSearchConfigV2');
        if (configStr) {
            // 如果有新版配置，直接加载并确保所有字段都存在
            return { ...defaultConfig, ...JSON.parse(configStr) };
        }

        // --- 向后兼容：尝试从旧版配置迁移 ---
        const oldConfigStr = localStorage.getItem('aiSearchConfig');
        if (oldConfigStr) {
            console.log("旧版配置已找到，正在迁移...");
            const oldConfig = JSON.parse(oldConfigStr);
            const newConfig = { ...defaultConfig };
            
            newConfig.tavilyKey = oldConfig.tavilyKey || '';
            newConfig.jinaKey = oldConfig.jinaKey || '';
            newConfig.googleCse = oldConfig.googleCse || [];
            newConfig.aiRole = oldConfig.aiRole || '药物研发';

            // 如果旧配置中有geminiKey，将其转换为新的aiEndpoint格式
            if (oldConfig.geminiKey) {
                const geminiEndpoint = {
                    id: `gemini-${Date.now()}`,
                    name: 'Gemini',
                    provider: 'gemini',
                    apiKey: oldConfig.geminiKey,
                    baseUrl: '',
                    model: 'gemini-2.5-flash' // 使用一个默认模型
                };
                newConfig.aiEndpoints.push(geminiEndpoint);
                // 默认将所有任务都分配给这个迁移过来的模型
                newConfig.aiAssignments.plan = geminiEndpoint.id;
                newConfig.aiAssignments.filter = geminiEndpoint.id;
                newConfig.aiAssignments.synthesize = geminiEndpoint.id;
            }
            
            // 保存新版配置并删除旧版
            this.save(newConfig);
            localStorage.removeItem('aiSearchConfig');
            return newConfig;
        }

        // 如果没有任何配置，返回全新默认配置
        return defaultConfig;
    },
    
    // 搜索历史记录 (无变化)
    getHistory() {
        const historyStr = localStorage.getItem('aiSearchHistory');
        return historyStr ? JSON.parse(historyStr) : [];
    },
    
    saveHistory(newEntry) {
        let history = this.getHistory();
        history.unshift(newEntry);
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        localStorage.setItem('aiSearchHistory', JSON.stringify(history));
    }
};