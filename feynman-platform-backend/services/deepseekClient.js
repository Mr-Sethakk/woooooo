// services/deepseekClient.js
const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = 'https://api.deepseek.com/v1';

if (!DEEPSEEK_API_KEY) {
  console.warn('[DeepSeekClient] 警告：未设置 DEEPSEEK_API_KEY，调用会失败');
}

async function chat(messages, opts = {}) {
  const {
    model = 'deepseek-chat',
    temperature = 0.2,
    max_tokens = 1200,
    stream = false,
  } = opts;

  try {
    const resp = await axios.post(
      `${BASE_URL}/chat/completions`,
      { model, messages, temperature, max_tokens, stream },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    const content = resp.data?.choices?.[0]?.message?.content || '';
    return content;
  } catch (e) {
    console.error('[DeepSeekClient] 调用失败:', e.response?.data || e.message);
    throw new Error(e.response?.data?.message || e.message);
  }
}

module.exports = { chat };

