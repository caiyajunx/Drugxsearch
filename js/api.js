// js/api.js
const apiService = {
    // --- Gemini API 调用 ---
    async callGemini(apiKey, model, messages, stream = false, isJson = false, onChunk = null) {
        const action = stream ? 'streamGenerateContent' : 'generateContent';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${apiKey}${stream ? '&alt=sse' : ''}`;
        
        const body = {
            contents: messages.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] })),
            generationConfig: isJson ? { responseMimeType: "application/json" } : {}
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API Error: ${error.error.message}`);
        }

        if (stream) {
            return this._processStream(response, 'gemini', onChunk);
        } else {
            const data = await response.json();
            const content = data.candidates[0].content.parts[0].text;
            return isJson ? JSON.parse(content) : content;
        }
    },

    // --- OpenAI 兼容 API 调用 ---
    async callOpenAI(apiKey, baseUrl, model, messages, stream = false, isJson = false, onChunk = null) {
        const url = new URL('/v1/chat/completions', baseUrl).href;
        
        const body = {
            model: model,
            messages: messages,
            stream: stream,
            response_format: isJson ? { type: "json_object" } : { type: "text" }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            const errorMsg = error.error ? error.error.message : JSON.stringify(error);
            throw new Error(`OpenAI API Error: ${errorMsg}`);
        }

        if (stream) {
            return this._processStream(response, 'openai', onChunk);
        } else {
            const data = await response.json();
            const content = data.choices[0].message.content;
            return isJson ? JSON.parse(content) : content;
        }
    },
    
    // --- 统一流式处理 ---
    async _processStream(response, provider, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep the potentially incomplete last line

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;

                const data = line.substring(6);
                if (data === '[DONE]') break;

                try {
                    const json = JSON.parse(data);
                    let text = '';
                    if (provider === 'gemini') {
                        text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    } else { // openai
                        text = json.choices?.[0]?.delta?.content || '';
                    }
                    if (text && onChunk) onChunk(text);
                } catch (error) {
                    console.error('Error parsing stream chunk:', data, error);
                }
            }
        }
    },

    // --- 统一的 API 调用入口 ---
    async callApi(endpointConfig, messages, stream, isJson, onChunk) {
        const { provider, apiKey, baseUrl, model } = endpointConfig;
        if (provider === 'gemini') {
            return this.callGemini(apiKey, model, messages, stream, isJson, onChunk);
        } else { // openai compatible
            return this.callOpenAI(apiKey, baseUrl, model, messages, stream, isJson, onChunk);
        }
    },

    // --- 任务函数（已更新为使用 endpointConfig）---
    async planAndDecomposeQuery(endpointConfig, userQuestion, cseConfigs, aiRole) {
        const cseContext = cseConfigs.map((cse, index) => 
            `- Index: ${index}\n  Description: ${cse.description}\n  Language: ${cse.language}`
        ).join('\n');

        const prompt = `
            # PERSONA & ROLE
            Your designated expert persona for this entire task is: **${aiRole}**.
            You are a sub-task expert in creating precise search plans from this persona's perspective.

            # AVAILABLE SEARCH ENGINES
            1.  **Tavily Search**: A general-purpose web search engine. Good for broad topics.
            2.  **Google Custom Search Engines (CSEs)**: Specialized search engines. Use them ONLY when the user's question clearly aligns with a CSE's description.
                ${cseContext ? cseContext : "  (No custom search engines configured)"}

            # TASK
            Based on the user's question and your persona, generate a JSON object outlining the search plan.
            1.  **Analysis**: Define the specific *domain* of this research and summarize the search *strategy* in one sentence.
            2.  **General Queries**: Create 1-3 concise queries for the general-purpose search engine (Tavily). Generate both Chinese and English versions.
            3.  **Custom Search Tasks**: Analyze if any configured CSEs are highly relevant. If so, create 1-3 specific queries for them, inspired by the CSE's description. If not, this array should be empty.

            # CSE QUERY GENERATION GUIDELINES & EXAMPLE
            Analyze the CSE's description for keywords that suggest specific search patterns.
            - **Example CSE Description**: "药物制剂处方搜索，商品名搜索更精准，俄罗斯会有辅料组成用量结果"
            - **Example User Question**: "Osimertinib"
            - **GOOD Example Query Set for this CSE**: ["Osimertinib formulation", "Tagrisso", "Osimertinib site:ru"]
            This is a good example because it includes the scientific name, a known trade name ("Tagrisso"), and a specialized query using hints from the description.

            # OUTPUT FORMAT (Strict JSON)
            Your entire response MUST be a single, valid JSON object, with no markdown formatting.
            {
              "plan_summary": {
                "domain": "The specific field of knowledge, e.g., 'Drug Formulation Information Retrieval'.",
                "strategy": "A brief, one-sentence summary of the search approach from the expert persona's perspective."
              },
              "general_queries": {
                "chinese": ["中文通用查询1"],
                "english": ["English general query 1"]
              },
              "custom_search_tasks": [
                {
                  "cse_index": 0,
                  "query": "A specific query tailored for the CSE at index 0"
                }
              ]
            }

            # USER QUESTION
            ${userQuestion}
        `;
        console.groupCollapsed('🔍 [Step 1] Assembled Prompt for Planning');
        console.log(prompt);
        console.groupEnd();
        const messages = [{ role: "user", content: prompt }];
        return await this.callApi(endpointConfig, messages, false, true, null);
    },

    async filterRelevantResults(endpointConfig, userQuestion, searchResults) {
        const searchContext = searchResults.map((res, index) => 
            `[Source ${index}]\nURL: ${res.url}\nSnippet: ${res.snippet}\n---`
        ).join('\n');

        const prompt = `
            # TASK
            You are a research assistant. Your goal is to identify the most relevant search results that are likely to contain a direct and comprehensive answer to the user's question.
            
            # INSTRUCTIONS
            1.  Analyze the user's question and the provided search result snippets.
            2.  Select the top 1 to 5 most promising search results. Prioritize results that seem comprehensive and directly related to the core of the question.
            3.  Return your answer as a single, valid JSON object with a single key "relevant_indices", which is an array of the integer indexes of the selected sources.
            
            # OUTPUT FORMAT (Strict JSON)
            {
              "relevant_indices": [0, 2, 4]
            }
            
            # USER QUESTION
            ${userQuestion}
            
            # SEARCH RESULTS
            ${searchContext}
        `;
        console.groupCollapsed('🔎 [Step 3] Assembled Prompt for Filtering');
        console.log(prompt);
        console.groupEnd();
        
        const messages = [{ role: "user", content: prompt }];
        const result = await this.callApi(endpointConfig, messages, false, true, null);
        return result.relevant_indices || [];
    },

    async synthesizeAnswer(endpointConfig, userQuestion, searchResults, articleSummaries, onChunk) {
        const searchResultsContext = searchResults.map((res, index) => 
            `[Source ${index + 1}]\nURL: ${res.url}\nOriginal Snippet: ${res.snippet}\n---`
        ).join('\n');

        const articleSummariesContext = articleSummaries.map(summary => 
            `[Deep Read of Source ${summary.originalIndex + 1}]\nURL: ${summary.url}\nAI-Generated Summary: ${summary.summary}\n---`
        ).join('\n');

        const prompt = `
            # ROLE
            You are a professional research analyst. Your task is to synthesize **all** the provided information into a comprehensive and well-structured answer to the user's original question. You have two types of information: initial search result snippets and detailed summaries from deep-reading the most relevant articles.

            # INSTRUCTIONS
            1.  **Language**: Write your entire response in **Simplified Chinese (简体中文)**.
            2.  **Content**: Base your answer ONLY on the information provided in the "SEARCH RESULT SNIPPETS" and "DEEP READ SUMMARIES" below. Prioritize information from the deep read summaries as it is more detailed.
            3.  **Citation**: For every piece of information or claim, you MUST cite the source by adding its number in brackets, like [1]. If a single sentence uses information from multiple sources, cite them all, like [1][3][5].
            4.  **Structure**: Format your answer in Markdown. Use headings, bullet points, and bold text to create a clear and readable report.
            5.  **Completeness**: If the provided information is insufficient to fully answer the question, explicitly state what is missing. Do not invent information.

            # SEARCH RESULT SNIPPETS
            ---
            ${searchResultsContext}
            ---

            # DEEP READ SUMMARIES
            ---
            ${articleSummariesContext}
            ---

            # USER's ORIGINAL QUESTION
            ${userQuestion}
        `;

        console.groupCollapsed('📝 [Step 5] Assembled Prompt for Synthesis');
        console.log(prompt);
        console.groupEnd();
        
        const messages = [{ role: "user", content: prompt }];
        await this.callApi(endpointConfig, messages, true, false, onChunk);
    },

    // --- 其他函数 (未修改) ---
    async searchTavily(apiKey, query) {
        console.log(`[Search] Using Tavily API for query: "${query}"`);
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey, query, search_depth: "basic", max_results: 5 })
        });
        if (!response.ok) throw new Error(`Tavily search failed for query: ${query}`);
        const data = await response.json();
        return data.results.map(res => ({ title: res.title, url: res.url, snippet: res.content, source: 'Tavily' }));
    },

    async searchGoogleCSE(apiKey, cseId, query) {
        console.log(`[Search] Using Google CSE (${cseId.substring(0, 5)}...) for query: "${query}"`);
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Google CSE search failed for query: ${query}`);
        const data = await response.json();
        return data.items ? data.items.map(item => ({ title: item.title, url: item.link, snippet: item.snippet, source: `CSE (${cseId.substring(0, 5)}...)` })) : [];
    },

    async fetchArticleContent(jinaApiKey, url) {
        console.log(`[Read] Using Jina.ai API for URL: "${url}"`);
        try {
            const response = await fetch(`https://r.jina.ai/${url}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${jinaApiKey}`, 'X-Retain-Images': 'none' }
            });
            if (!response.ok) throw new Error(`Jina.ai API request failed with status ${response.status} for url: ${url}`);
            return await response.text();
        } catch (error) {
            console.error(`Failed to fetch content for ${url}:`, error);
            return `Error: Could not fetch content for ${url}. ${error.message}`;
        }
    },
    
    // (summarizeArticle 已被移除，因为它的逻辑可以合并到主流程中或被通用API调用取代)
};