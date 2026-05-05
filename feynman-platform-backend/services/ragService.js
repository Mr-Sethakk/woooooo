// services/ragService.js
// 编排：问题向量化 -> 相似片段检索 -> 构造 Prompt -> 调用 DeepSeek 生成回答

const { searchSimilarChunks } = require('./vectorStoreService');
const { chat } = require('./deepseekClient');

function buildRagPrompt(question, contexts) {
  const sourcesBlock = contexts
    .map((c, i) => `【片段${i + 1} | KP:${c.title || c.kpId} | 相似度:${(c.score * 100).toFixed(1)}%】\n${c.text}`)
    .join('\n\n');

  return `你是一个严谨的技术助教。请仅根据提供的“知识片段”来回答用户的问题，
并在无法确定答案时明确说明“根据当前知识库无法回答”。禁止编造。

【用户问题】\n${question}

【知识片段】\n${sourcesBlock}

请用中文回答，并在答案末尾附上“引用来源”的编号列表（如：[1][3]），对应上面的片段编号。`;
}

async function answerQuestion({ question, topK = 5, filterKpIds = [], minScore = 0.2, userId }) {
  const contexts = await searchSimilarChunks(question, topK, {
    allowedKpIds: filterKpIds,
    minScore,
    userId
  });

  if (!contexts || contexts.length === 0) {
    return {
      answer: '抱歉，根据当前知识库未检索到相关内容，暂无法回答。请先在知识库中补充相关知识点后重试。',
      sources: []
    };
  }

  const prompt = buildRagPrompt(question, contexts);
  const messages = [
    { role: 'system', content: '你是一个可靠、谨慎且不编造的专业助教。' },
    { role: 'user', content: prompt },
  ];

  const completion = await chat(messages, { temperature: 0.1, max_tokens: 1200 });

  const sources = contexts.map((c, i) => ({
    index: i + 1,
    kpId: c.kpId,
    title: c.title || '',
    score: c.score,
    preview: c.text.slice(0, 180)
  }));

  return { answer: completion, sources };
}

module.exports = { answerQuestion };

