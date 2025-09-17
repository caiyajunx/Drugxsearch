// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const { elements } = uiManager;
    let currentConfig = configManager.load();

    function initializeApp() {
        uiManager.initEventListeners();
        if (currentConfig.tavilyKey && currentConfig.aiAssignments.plan && currentConfig.aiAssignments.synthesize) {
            uiManager.showView('search-view');
        } else {
            uiManager.showView('settings-view');
        }
        uiManager.loadConfigToForm(currentConfig);
    }

    elements.settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentConfig = uiManager.getConfigFromForm();
        if (!currentConfig.tavilyKey) {
            alert('请填写 Tavily 的 API Key。');
            return;
        }
        if (!currentConfig.aiAssignments.plan || !currentConfig.aiAssignments.filter || !currentConfig.aiAssignments.synthesize) {
            alert('请为所有AI任务分配一个模型。');
            return;
        }
        if (currentConfig.aiEndpoints.some(ep => !ep.name || !ep.apiKey || !ep.model)) {
            alert('请确保每个AI模型都已填写名称、API Key和模型标识。');
            return;
        }
        configManager.save(currentConfig);
        alert('配置已保存！');
        uiManager.showView('search-view');
    });
    
    // --- 配置导入/导出 (逻辑微调以适应新配置) ---
    elements.exportConfigBtn.addEventListener('click', () => {
        const configToExport = uiManager.getConfigFromForm();
        const blob = new Blob([JSON.stringify(configToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-search-config-v2-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    elements.importConfigBtn.addEventListener('click', () => {
        elements.importConfigInput.click();
    });

    elements.importConfigInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedConfig = JSON.parse(e.target.result);
                // 简单验证导入文件的结构
                if (typeof importedConfig.tavilyKey !== 'undefined' && Array.isArray(importedConfig.aiEndpoints)) {
                    configManager.save(importedConfig);
                    currentConfig = importedConfig;
                    uiManager.loadConfigToForm(currentConfig);
                    alert('配置导入成功！');
                } else {
                    alert('导入失败：文件格式不正确或缺少关键字段。');
                }
            } catch (error) {
                console.error('导入配置失败:', error);
                alert(`导入失败: ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });

    // --- 主搜索流程 (已更新) ---
    async function runSearch(userQuestion) {
        if (!userQuestion) return;
        
        // --- 辅助函数：根据ID获取完整的AI模型配置 ---
        const getEndpointConfigById = (id) => {
            if (!id) return null;
            return currentConfig.aiEndpoints.find(ep => ep.id === id);
        };
        
        // --- 获取任务分配的AI配置 ---
        const planEndpoint = getEndpointConfigById(currentConfig.aiAssignments.plan);
        const filterEndpoint = getEndpointConfigById(currentConfig.aiAssignments.filter);
        const synthesizeEndpoint = getEndpointConfigById(currentConfig.aiAssignments.synthesize);

        if (!planEndpoint || !filterEndpoint || !synthesizeEndpoint) {
            alert("启动失败：请先在配置中心为所有AI任务分配有效的模型。");
            uiManager.showView('settings-view');
            return;
        }

        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        console.clear(); 
        console.log(`🚀 Starting new research for: "${userQuestion}"`);

        uiManager.showView('results-view');
        uiManager.createTimeline();
        uiManager.streamToAnswerContainer(''); 
        uiManager.renderResults(userQuestion, []);

        try {
            // 1. 规划问题
            uiManager.updateTimeline(0, 'active', { title: `分析用户意图 (使用 ${planEndpoint.name})`, content: `正在分析问题: "${userQuestion}"` });
            const plan = await apiService.planAndDecomposeQuery(
                planEndpoint, 
                userQuestion, 
                currentConfig.googleCse,
                currentConfig.aiRole
            );
            console.log('✅ [Step 1] Plan Generated:', plan);
            const queriesForDisplay = `角色: ${currentConfig.aiRole}\n领域: ${plan.plan_summary.domain}\n策略: ${plan.plan_summary.strategy}\n\n通用查询 (中):\n- ${plan.general_queries.chinese.join('\n- ')}\n\n通用查询 (英):\n- ${plan.general_queries.english.join('\n- ')}\n\n自定义搜索:\n${plan.custom_search_tasks.length > 0 ? plan.custom_search_tasks.map(t => `- [${currentConfig.googleCse[t.cse_index].description.split('\n')[0]}] ${t.query}`).join('\n') : '- 无'}`;
            uiManager.updateTimeline(0, 'completed', { title: "生成搜索计划", content: queriesForDisplay });
            
            // 2. 执行搜索
            uiManager.updateTimeline(1, 'active');
            const allGeneralQueries = [...plan.general_queries.chinese, ...plan.general_queries.english];
            const tavilyPromises = allGeneralQueries.map(query => 
                apiService.searchTavily(currentConfig.tavilyKey, query).catch(e => { console.error(e); return []; })
            );

            const cseTasks = plan.custom_search_tasks.map(task => {
                const cseConfig = currentConfig.googleCse[task.cse_index];
                return cseConfig ? { config: cseConfig, query: task.query } : null;
            }).filter(Boolean);
            
            const timelineDetails = `正在执行 ${allGeneralQueries.length} 个通用查询。\n` +
                                    (cseTasks.length > 0 ? `即将依次执行 ${cseTasks.length} 个自定义搜索 (间隔1秒)...` : '');
            uiManager.updateTimeline(1, 'active', { title: "执行搜索", content: timelineDetails });

            const tavilyResultsArrays = await Promise.all(tavilyPromises);

            let cseResults = [];
            for (let i = 0; i < cseTasks.length; i++) {
                const task = cseTasks[i];
                try {
                    const singleQueryResult = await apiService.searchGoogleCSE(task.config.key, task.config.id, task.query);
                    cseResults = cseResults.concat(singleQueryResult);
                } catch (e) { console.error(e); }
                if (i < cseTasks.length - 1) await delay(1100);
            }

            const allResults = tavilyResultsArrays.flat().concat(cseResults);
            const searchResults = [...new Map(allResults.map(item => [item.url, item])).values()];

            console.log(`✅ [Step 2] Search Completed. Total unique results: ${searchResults.length}`);
            uiManager.updateTimeline(1, 'completed', { title: "搜索完成", content: `共获取 ${searchResults.length} 条不重复的结果。` });
            uiManager.renderResults(userQuestion, searchResults);

            // 3. 分析结果，筛选出最相关的
            uiManager.updateTimeline(2, 'active', { title: `分析搜索结果 (使用 ${filterEndpoint.name})`, content: `正在从 ${searchResults.length} 条结果中筛选最核心的来源...` });
            const relevantIndices = await apiService.filterRelevantResults(filterEndpoint, userQuestion, searchResults);
            const relevantResults = relevantIndices.map(index => ({...searchResults[index], originalIndex: index}));
            console.log(`✅ [Step 3] Filtering Completed. Relevant indices: [${relevantIndices.join(', ')}]`);
            const relevancySummary = `分析了 ${searchResults.length} 条搜索结果。\n筛选出 ${relevantResults.length} 条最相关的结果进行深度阅读：\n${relevantResults.map(r => `- [${r.originalIndex + 1}] ${r.title}`).join('\n')}\n\n剔除了 ${searchResults.length - relevantResults.length} 条相关性较低的结果。`;
            uiManager.updateTimeline(2, 'completed', { title: "结果分析完毕", content: relevancySummary });

            // 4. 阅读源文并综合报告
            let articleSummaries = [];
            if (currentConfig.jinaKey && relevantResults.length > 0) {
                const summaryPromises = relevantResults.map(async (result) => {
                    const articleContent = await apiService.fetchArticleContent(currentConfig.jinaKey, result.url);
                    // 不再单独调用总结API，而是将原文内容直接喂给最终的综合报告模型
                    return { ...result, summary: articleContent };
                });
                articleSummaries = await Promise.all(summaryPromises);
            }

            // 5. 综合报告
            uiManager.updateTimeline(3, 'active', { title: `综合与撰写 (使用 ${synthesizeEndpoint.name})`, content: "AI正在阅读所有材料并撰写最终报告..." });
            let fullAnswer = "";
            await apiService.synthesizeAnswer(
                synthesizeEndpoint, 
                userQuestion, 
                searchResults,
                articleSummaries, // 传递的是包含原文内容的摘要对象
                (chunk) => {
                    fullAnswer += chunk;
                    uiManager.streamToAnswerContainer(fullAnswer);
                }
            );
            console.log('✅ [Step 4] Final Synthesized Answer Generated.');
            uiManager.updateTimeline(3, 'completed', { title: "报告生成完毕", content: "最终报告已生成。" });
            
            configManager.saveHistory({ question: userQuestion, answer: fullAnswer, sources: searchResults, timestamp: new Date().toISOString() });

        } catch (error) {
            console.error('主流程出错:', error);
            const activeNodeIndex = uiManager.timelineSteps.findIndex((_, i) => document.getElementById(`timeline-node-${i}`)?.classList.contains('active'));
            if(activeNodeIndex !== -1) {
                uiManager.updateTimeline(activeNodeIndex, 'error', { title: "发生错误", content: error.message });
            }
             uiManager.streamToAnswerContainer(`❌ **报告生成失败**\n\n**错误信息:**\n\`\`\`\n${error.message}\n\`\`\``);
        }
    }

    elements.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        runSearch(elements.userQuestionInput.value.trim());
    });
    
    elements.newSearchFormResults.addEventListener('submit', (e) => {
        e.preventDefault();
        runSearch(elements.newQuestionInput.value.trim());
    });

    elements.addCseBtn.addEventListener('click', () => uiManager.addCseConfig());
    elements.gotoSettingsBtn.addEventListener('click', () => uiManager.showView('settings-view'));
    elements.gotoSettingsBtnResults.addEventListener('click', () => uiManager.showView('settings-view'));

    initializeApp();
});