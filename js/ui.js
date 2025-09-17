// js/ui.js
const uiManager = {
    // --- Constants for Icons ---
    eyeIconSVG: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    eyeOffIconSVG: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>`,

    elements: {
        settingsView: document.getElementById('settings-view'),
        searchView: document.getElementById('search-view'),
        resultsView: document.getElementById('results-view'),
        settingsForm: document.getElementById('settings-form'),
        searchForm: document.getElementById('search-form'),
        newSearchFormResults: document.getElementById('new-search-form-results'),
        
        // --- 新增和修改的元素 ---
        tavilyKeyInput: document.getElementById('tavily-key'),
        jinaKeyInput: document.getElementById('jina-key'),
        aiRoleSelect: document.getElementById('ai-role-select'), 
        aiEndpointsContainer: document.getElementById('ai-endpoints-container'),
        addAiEndpointBtn: document.getElementById('add-ai-endpoint-btn'),
        assignPlanSelect: document.getElementById('assign-plan'),
        assignFilterSelect: document.getElementById('assign-filter'),
        assignSynthesizeSelect: document.getElementById('assign-synthesize'),
        
        googleCseConfigs: document.getElementById('google-cse-configs'),
        addCseBtn: document.getElementById('add-cse-btn'),
        gotoSettingsBtn: document.getElementById('goto-settings-btn'),
        gotoSettingsBtnResults: document.getElementById('goto-settings-btn-results'),
        questionDisplay: document.getElementById('question-display'),
        answerContainer: document.getElementById('answer-container'),
        sourcesList: document.getElementById('sources-list'),
        userQuestionInput: document.getElementById('user-question'),
        newQuestionInput: document.getElementById('new-question-input'),
        timelineContainer: document.getElementById('timeline-container'),
        timelineDetailsPanel: document.getElementById('timeline-details-panel'),
        importConfigBtn: document.getElementById('import-config-btn'),
        importConfigInput: document.getElementById('import-config-input'),
        exportConfigBtn: document.getElementById('export-config-btn'),
    },

    initEventListeners() {
        this.elements.settingsForm.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.password-toggle-btn');
            const removeCseBtn = e.target.closest('.remove-cse-btn');
            const removeAiBtn = e.target.closest('.remove-ai-btn');

            if (toggleBtn) this._togglePasswordVisibility(toggleBtn);
            if (removeCseBtn) removeCseBtn.closest('.cse-config-group').remove();
            if (removeAiBtn) {
                removeAiBtn.closest('.ai-endpoint-group').remove();
                this.updateAssignmentOptions(); // AI模型被移除，更新任务分配下拉框
            }
        });
        
        this.elements.settingsForm.addEventListener('change', (e) => {
             // 当AI模型提供商变化时，切换Base URL的显示
            if (e.target.classList.contains('ai-provider-select')) {
                const provider = e.target.value;
                const baseUrlGroup = e.target.closest('.ai-endpoint-group').querySelector('.base-url-group');
                baseUrlGroup.classList.toggle('hidden', provider !== 'openai');
            }
        });

        this.elements.settingsForm.addEventListener('input', (e) => {
            // 当AI模型名称变化时，实时更新任务分配下拉框中的选项文本
             if (e.target.classList.contains('ai-name-input')) {
                this.updateAssignmentOptions();
            }
        });
        
        this.elements.addAiEndpointBtn.addEventListener('click', () => {
             this.addAiEndpoint();
             this.updateAssignmentOptions();
        });

        this.elements.settingsForm.querySelectorAll('.password-toggle-btn').forEach(btn => {
            btn.innerHTML = this.eyeIconSVG;
        });
    },

    _togglePasswordVisibility(button) {
        const input = button.previousElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = this.eyeOffIconSVG;
        } else {
            input.type = 'password';
            button.innerHTML = this.eyeIconSVG;
        }
    },

    showView(viewIdToShow) {
        [this.elements.settingsView, this.elements.searchView, this.elements.resultsView].forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(viewIdToShow)?.classList.remove('hidden');
    },
    
    // --- 新增：动态添加AI模型配置 ---
    addAiEndpoint(endpoint = {}) {
        const defaults = {
            id: `endpoint-${Date.now()}`,
            name: '',
            provider: 'openai',
            apiKey: '',
            baseUrl: 'https://api.deepseek.com',
            model: 'deepseek-chat',
            ...endpoint
        };

        const div = document.createElement('div');
        div.className = 'p-3 border border-border rounded-lg space-y-3 ai-endpoint-group';
        div.dataset.id = defaults.id;
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h4 class="font-semibold text-sm">AI 模型</h4>
                <button type="button" class="button button-destructive button-sm remove-ai-btn">移除</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="label text-xs">模型名称 (自定义)</label>
                    <input type="text" placeholder="例如：DeepSeek主力模型" value="${defaults.name}" class="input input-sm ai-name-input" required>
                </div>
                <div>
                    <label class="label text-xs">模型提供商</label>
                    <select class="input input-sm ai-provider-select">
                        <option value="openai" ${defaults.provider === 'openai' ? 'selected' : ''}>OpenAI 兼容</option>
                        <option value="gemini" ${defaults.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                    </select>
                </div>
            </div>
             <div class="space-y-2">
                <label class="label text-xs">API Key</label>
                <div class="relative">
                    <input type="password" placeholder="API Key" value="${defaults.apiKey}" class="input input-sm ai-apikey-input pr-10" required>
                    <button type="button" class="password-toggle-btn" aria-label="Toggle API Key visibility">${this.eyeIconSVG}</button>
                </div>
            </div>
            <div class="space-y-2 base-url-group ${defaults.provider !== 'openai' ? 'hidden' : ''}">
                 <label class="label text-xs">Base URL</label>
                 <input type="text" placeholder="https://api.deepseek.com" value="${defaults.baseUrl}" class="input input-sm ai-baseurl-input">
            </div>
             <div class="space-y-2">
                 <label class="label text-xs">模型标识</label>
                 <input type="text" placeholder="例如：deepseek-chat" value="${defaults.model}" class="input input-sm ai-model-input" required>
            </div>
        `;
        this.elements.aiEndpointsContainer.appendChild(div);
    },
    
    // --- 新增：更新任务分配下拉框的选项 ---
    updateAssignmentOptions() {
        const endpoints = Array.from(this.elements.aiEndpointsContainer.querySelectorAll('.ai-endpoint-group')).map(group => ({
            id: group.dataset.id,
            name: group.querySelector('.ai-name-input').value.trim() || `未命名模型 (${group.dataset.id.slice(-4)})`
        }));
        
        const selects = [this.elements.assignPlanSelect, this.elements.assignFilterSelect, this.elements.assignSynthesizeSelect];
        
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- 请选择一个模型 --</option>';
            endpoints.forEach(ep => {
                const option = new Option(ep.name, ep.id);
                select.appendChild(option);
            });
            select.value = currentValue; // 尝试恢复之前的选择
        });
    },
    
    loadConfigToForm(config) {
        this.elements.tavilyKeyInput.value = config.tavilyKey;
        this.elements.jinaKeyInput.value = config.jinaKey || '';
        this.elements.aiRoleSelect.value = config.aiRole || '药物研发';

        // 加载AI模型配置
        this.elements.aiEndpointsContainer.innerHTML = '';
        if (config.aiEndpoints && config.aiEndpoints.length > 0) {
            config.aiEndpoints.forEach(ep => this.addAiEndpoint(ep));
        }
        
        // 更新并设置任务分配
        this.updateAssignmentOptions();
        this.elements.assignPlanSelect.value = config.aiAssignments.plan || '';
        this.elements.assignFilterSelect.value = config.aiAssignments.filter || '';
        this.elements.assignSynthesizeSelect.value = config.aiAssignments.synthesize || '';

        // 加载CSE配置 (无变化)
        this.elements.googleCseConfigs.innerHTML = '';
        if (config.googleCse && config.googleCse.length > 0) {
            config.googleCse.forEach(cse => this.addCseConfig(cse));
        }
    },

    getConfigFromForm() {
        const aiEndpointGroups = this.elements.aiEndpointsContainer.querySelectorAll('.ai-endpoint-group');
        const aiEndpoints = Array.from(aiEndpointGroups).map(group => ({
            id: group.dataset.id,
            name: group.querySelector('.ai-name-input').value.trim(),
            provider: group.querySelector('.ai-provider-select').value,
            apiKey: group.querySelector('.ai-apikey-input').value.trim(),
            baseUrl: group.querySelector('.ai-baseurl-input').value.trim(),
            model: group.querySelector('.ai-model-input').value.trim(),
        }));

        const cseGroups = this.elements.googleCseConfigs.querySelectorAll('.cse-config-group');
        const googleCse = Array.from(cseGroups).map(group => ({
            description: group.querySelector('.cse-description').value.trim(),
            language: group.querySelector('.cse-language').value,
            key: group.querySelector('.cse-key').value.trim(),
            id: group.querySelector('.cse-id').value.trim()
        })).filter(cse => cse.description && cse.key && cse.id);

        return {
            tavilyKey: this.elements.tavilyKeyInput.value.trim(),
            jinaKey: this.elements.jinaKeyInput.value.trim(),
            aiRole: this.elements.aiRoleSelect.value,
            aiEndpoints,
            aiAssignments: {
                plan: this.elements.assignPlanSelect.value,
                filter: this.elements.assignFilterSelect.value,
                synthesize: this.elements.assignSynthesizeSelect.value,
            },
            googleCse
        };
    },
    
    // 其他UI函数 (无变化)
    addCseConfig(cse = { description: '', language: '中/英', key: '', id: '' }) {
        const div = document.createElement('div');
        div.className = 'p-4 border border-border rounded-lg space-y-3 cse-config-group';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h4 class="font-semibold text-sm">自定义搜索引擎</h4>
                <button type="button" class="button button-destructive button-sm remove-cse-btn">移除</button>
            </div>
            <div class="space-y-2">
                <label class="label text-xs">说明 (AI将根据此描述决定是否使用)</label>
                <textarea placeholder="例如：药物制剂处方搜索" class="textarea input-sm cse-description" rows="3">${cse.description}</textarea>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div class="col-span-1">
                    <label class="label text-xs">语言</label>
                    <select class="input input-sm cse-language">
                        <option value="中/英" ${cse.language === '中/英' ? 'selected' : ''}>中/英</option>
                        <option value="中文" ${cse.language === '中文' ? 'selected' : ''}>中文</option>
                        <option value="英文" ${cse.language === '英文' ? 'selected' : ''}>英文</option>
                    </select>
                </div>
                <div class="col-span-2">
                    <label class="label text-xs">Google API Key</label>
                    <div class="relative">
                        <input type="password" placeholder="Google API Key" value="${cse.key}" class="input input-sm cse-key pr-10">
                        <button type="button" class="password-toggle-btn" aria-label="Toggle CSE Key visibility">${this.eyeIconSVG}</button>
                    </div>
                </div>
            </div>
            <div class="space-y-2">
                 <label class="label text-xs">CSE ID</label>
                 <input type="text" placeholder="CSE ID" value="${cse.id}" class="input input-sm cse-id">
            </div>
        `;
        this.elements.googleCseConfigs.appendChild(div);
    },
    
    streamToAnswerContainer(fullMarkdownContent) {
        let htmlAnswer = marked.parse(fullMarkdownContent);
        htmlAnswer = htmlAnswer.replace(/\[(\d+)\]/g, (match, number) => `<span class="citation-marker">${number}</span>`);
        this.elements.answerContainer.innerHTML = htmlAnswer;
    },
    
    timelineSteps: ['分析意图', '执行搜索', '分析结果', '综合报告'],
    createTimeline() { this.elements.timelineContainer.innerHTML = `<div class="timeline">${this.timelineSteps.map((step, index) => `<div class="timeline-node" id="timeline-node-${index}" data-step="${index}"><div class="timeline-node-dot"></div><div class="timeline-node-label">${step}</div></div>`).join('')}</div>`; this.elements.timelineDetailsPanel.classList.add('hidden'); this.elements.timelineDetailsPanel.innerHTML = ''; },
    updateTimeline(stepIndex, status, details = null) { const node = document.getElementById(`timeline-node-${stepIndex}`); if (!node) return; for (let i = 0; i < stepIndex; i++) { const prevNode = document.getElementById(`timeline-node-${i}`); if(prevNode && !prevNode.classList.contains('error')) prevNode.className = 'timeline-node completed'; } node.className = `timeline-node ${status}`; node.dataset.details = details ? JSON.stringify(details) : ''; node.onclick = () => { if (node.dataset.details) { const detailData = JSON.parse(node.dataset.details); this.elements.timelineDetailsPanel.innerHTML = `<h4>${detailData.title}</h4><pre>${detailData.content}</pre>`; this.elements.timelineDetailsPanel.classList.remove('hidden'); } else { this.elements.timelineDetailsPanel.classList.add('hidden'); } }; },
    renderResults(question, sources) { this.elements.questionDisplay.textContent = `关于 "${question}"`; this.elements.newQuestionInput.value = question; this.elements.sourcesList.innerHTML = ''; const uniqueSources = Array.from(new Map(sources.map(item => [item.url, item])).values()); uniqueSources.forEach((source, index) => { const li = document.createElement('li'); const header = document.createElement('div'); header.className = 'source-header'; header.innerHTML = `<a href="${source.url}" target="_blank" rel="noopener noreferrer" title="${source.title}">[${index + 1}] ${source.title}</a>`; const snippet = document.createElement('p'); snippet.className = 'source-snippet'; snippet.textContent = source.snippet; header.addEventListener('click', (e) => { if (e.target.tagName.toLowerCase() === 'a') return; header.classList.toggle('expanded'); snippet.classList.toggle('expanded'); }); li.appendChild(header); li.appendChild(snippet); this.elements.sourcesList.appendChild(li); }); }
};