// services/vectorStoreService.js
// 轻量版 RAG 索引服务：文本分割 + 调用百度千帆 v2 Embeddings + 本地JSON向量存储

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const axios = require('axios');

// 简易延时与重试控制
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastEmbeddingCallTs = 0;
let embedQueue = Promise.resolve();
const RPM_WINDOW_MS = 60000;
let cooldownUntil = 0;
let callTimestamps = [];

function scheduleEmbedding(fn) {
  const run = () => fn();
  const p = embedQueue.then(run, run);
  embedQueue = p.catch(() => {});
  return p;
}

function isRateLimitError(e) {
  const data = e?.response?.data;
  const status = e?.response?.status;
  const code = data?.error?.code || data?.error_code || '';
  const type = data?.error?.type || '';
  return status === 429 || String(code).includes('rate_limit') || String(type).includes('rate_limit');
}

async function doPostWithRetry(url, body, headers, opts = {}) {
  const {
    maxRetries = 5,
    baseDelayMs = 800,
    minIntervalMs = 250, // 控制全局最小调用间隔，降低 RPM
    timeout = 30000,
    rpmLimit,
    cooldownMs,
  } = opts;

  let attempt = 0;
  while (true) {
    const now = Date.now();

    // 全局冷却期：若之前命中过限流，则在冷却时间内等待
    if (now < cooldownUntil) {
      await sleep(cooldownUntil - now);
    }

    // 最小调用间隔
    const elapsed = now - lastEmbeddingCallTs;
    if (elapsed < minIntervalMs) {
      await sleep(minIntervalMs - elapsed);
    }

    // 简易 RPM 限制：若过去 60s 内调用数达到上限，则等待到窗口滑出
    callTimestamps = callTimestamps.filter(t => now - t < RPM_WINDOW_MS);
    if (callTimestamps.length >= V_MAX_RPM) {
      const wait = callTimestamps[0] + RPM_WINDOW_MS - now + 50;
      warn(`达到每分钟最大请求数限制，等待 ${wait}ms 再试`);
      await sleep(wait);
      continue;
    }

    try {
      const resp = await scheduleEmbedding(() => axios.post(url, body, { headers: { 'Content-Type': 'application/json', ...(headers || {}) }, timeout }));
      lastEmbeddingCallTs = Date.now();
      callTimestamps.push(lastEmbeddingCallTs);
      return resp;
    } catch (e) {
      const isRate = isRateLimitError(e);
      if (isRate) {
        cooldownUntil = Date.now() + V_COOLDOWN_MS; // 设置全局冷却
      }
      if (isRate && attempt < maxRetries) {
        const delay = Math.round(baseDelayMs * Math.pow(2, attempt) + Math.random() * 250);
        warn(`向量服务限流，${delay}ms 后重试 (attempt=${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        attempt++;
        continue;
      }
      throw e;
    }
  }
}

const VECTOR_DIR = path.join(__dirname, '../vector_store');
const VECTOR_FILE = path.join(VECTOR_DIR, 'index.json');

// 可调限流与分片参数（也可通过环境变量覆盖）
const V_MIN_INTERVAL_MS = parseInt(process.env.VEC_MIN_INTERVAL_MS || '800', 10); // 最小请求间隔，控制 RPM
const V_RETRY_MAX = parseInt(process.env.VEC_RETRY_MAX || '6', 10);              // 最大重试次数
const V_RETRY_BASE_DELAY = parseInt(process.env.VEC_RETRY_BASE_DELAY || '1200', 10); // 指数退避基准延时
const V_BATCH_SIZE = parseInt(process.env.VEC_BATCH_SIZE || '4', 10);            // 每次请求的输入数量，过大会触发 TPM
const V_CHUNK_SIZE = parseInt(process.env.VEC_CHUNK_SIZE || '600', 10);          // 文本分片长度，过长会触发 TPM
const V_CHUNK_OVERLAP = parseInt(process.env.VEC_CHUNK_OVERLAP || '80', 10);     // 分片重叠，平衡上下文连续性
const V_MAX_RPM = parseInt(process.env.VEC_MAX_RPM || '12', 10);                 // 每分钟最大请求数
const V_COOLDOWN_MS = parseInt(process.env.VEC_COOLDOWN_MS || '60000', 10);      // 触发限流后的冷却时长

// 仅用 .env 配置（不再读取任何本地配置文件）
const PROVIDER = process.env.EMBEDDINGS_PROVIDER || 'qianfan';
const QF_ENDPOINT = process.env.QIANFAN_V2_EMBEDDING_ENDPOINT; // 如 https://qianfan.baidubce.com/v2/embeddings
const QF_API_KEY = process.env.QIANFAN_V2_API_KEY;             // 形如 bce-v3/...（如账户要求可配合 Bearer）
const QF_MODEL = process.env.QIANFAN_V2_MODEL || 'embedding-v1';

// 简易日志工具
function log(...args) { console.log('[VectorStore]', ...args); }
function warn(...args) { console.warn('[VectorStore][WARN]', ...args); }
function error(...args) { console.error('[VectorStore][ERROR]', ...args); }

// 🆕 改进的文本分割器：智能按段落和句子切分，保持语义完整性
// 优先按段落切分，如果段落过长则按句子切分，最后才按字符切分
function splitText(content, chunkSize = 800, chunkOverlap = 100) {
  if (!content || typeof content !== 'string') return [];
  
  // 1. 先按段落分割（双换行或单换行）
  const paragraphs = content.split(/\n\n+|\n/).filter(p => p.trim());
  
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;
    
    // 如果当前段落加入后不超过限制，直接加入
    if ((currentChunk + '\n' + trimmedPara).length <= chunkSize) {
      currentChunk = currentChunk ? currentChunk + '\n' + trimmedPara : trimmedPara;
    } else {
      // 保存当前chunk
      if (currentChunk) {
        chunks.push({ index: chunkIndex++, content: currentChunk });
        
        // 保留重叠部分（最后 chunkOverlap 个字符）
        const overlapText = currentChunk.slice(-chunkOverlap);
        currentChunk = overlapText + '\n' + trimmedPara;
      } else {
        // 单个段落就超长，需要进一步切分
        if (trimmedPara.length > chunkSize) {
          // 按句子切分
          const sentences = trimmedPara.match(/[^。！？.!?]+[。！？.!?]+/g) || [trimmedPara];
          let sentenceChunk = '';
          
          for (const sentence of sentences) {
            if ((sentenceChunk + sentence).length <= chunkSize) {
              sentenceChunk += sentence;
            } else {
              if (sentenceChunk) {
                chunks.push({ index: chunkIndex++, content: sentenceChunk });
                sentenceChunk = sentence;
              } else {
                // 单个句子都超长，按字符强制切分
                let start = 0;
                while (start < sentence.length) {
                  const end = Math.min(start + chunkSize, sentence.length);
                  chunks.push({ index: chunkIndex++, content: sentence.slice(start, end) });
                  start = end - chunkOverlap;
                  if (start < 0) start = end;
                }
              }
            }
          }
          
          if (sentenceChunk) {
            currentChunk = sentenceChunk;
          }
        } else {
          currentChunk = trimmedPara;
        }
      }
    }
  }
  
  // 保存最后一个chunk
  if (currentChunk && currentChunk.trim()) {
    chunks.push({ index: chunkIndex++, content: currentChunk });
  }
  
  // 如果没有生成任何chunk，使用原始内容
  if (chunks.length === 0 && content.trim()) {
    chunks.push({ index: 0, content: content.trim() });
  }
  
  return chunks;
}

// 尝试用 AK/SK 获取 access_token（如果 .env 提供了 QIANFAN_API_KEY / QIANFAN_SECRET_KEY）
async function fetchQianfanAccessToken() {
  const API_KEY = process.env.QIANFAN_API_KEY || process.env.QIANFAN_CLIENT_ID;
  const SECRET_KEY = process.env.QIANFAN_SECRET_KEY || process.env.QIANFAN_CLIENT_SECRET;
  if (!API_KEY || !SECRET_KEY) return null;
  try {
    const tokenResp = await axios.get('https://aip.baidubce.com/oauth/2.0/token', {
      params: {
        grant_type: 'client_credentials',
        client_id: API_KEY,
        client_secret: SECRET_KEY,
      },
      timeout: 15000,
    });
    return tokenResp.data?.access_token || null;
  } catch (e) {
    warn('获取千帆 access_token 失败:', e.response?.data || e.message);
    return null;
  }
}

// 仅使用 .env：优先 access_token；否则回退 Authorization 头
async function embedWithQianfanV2(inputs) {
  if (!QF_ENDPOINT) {
    throw new Error('缺少 QIANFAN_V2_EMBEDDING_ENDPOINT 环境变量');
  }

  const body = { input: inputs, model: QF_MODEL };

  // 1) 若提供 access_token，优先使用 ?access_token=...
  let accessToken = process.env.QIANFAN_V2_ACCESS_TOKEN;
  let url = QF_ENDPOINT;

  if (!accessToken) {
    // 2) 若提供 API_KEY/SECRET，自动获取 access_token
    accessToken = await fetchQianfanAccessToken();
  }

  if (accessToken) {
    const tokenUrl = url + (url.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(accessToken);
    try {
      const resp = await doPostWithRetry(
        tokenUrl,
        body,
        { 'Content-Type': 'application/json' },
        { timeout: 30000, minIntervalMs: V_MIN_INTERVAL_MS, maxRetries: V_RETRY_MAX, baseDelayMs: V_RETRY_BASE_DELAY }
      );
      return parseQianfanEmbeddings(resp.data);
    } catch (e) {
      const status = e?.response?.status;
      if (status !== 401 && status !== 403) throw e;
      warn('access_token 调用失败，回退到 Authorization 头部鉴权');
    }
  }

  // 3) 回退到 Authorization 鉴权（两种尝试）
  if (!QF_API_KEY) {
    throw new Error('缺少 QIANFAN_V2_API_KEY 环境变量（或提供 QIANFAN_API_KEY/QIANFAN_SECRET_KEY 以自动换取 access_token）');
  }

  // 尝试 A：Authorization: <key>
  try {
    const respA = await doPostWithRetry(
      url,
      body,
      { 'Content-Type': 'application/json', 'Authorization': QF_API_KEY },
      { timeout: 30000, minIntervalMs: V_MIN_INTERVAL_MS, maxRetries: V_RETRY_MAX, baseDelayMs: V_RETRY_BASE_DELAY }
    );
    return parseQianfanEmbeddings(respA.data);
  } catch (eA) {
    const statusA = eA?.response?.status;
    if (statusA !== 401 && statusA !== 403) throw eA;
    // 尝试 B：Authorization: Bearer <key>
    try {
      const respB = await doPostWithRetry(
        url,
        body,
        { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + QF_API_KEY },
        { timeout: 30000, minIntervalMs: V_MIN_INTERVAL_MS, maxRetries: V_RETRY_MAX, baseDelayMs: V_RETRY_BASE_DELAY }
      );
      return parseQianfanEmbeddings(respB.data);
    } catch (eB) {
      const detail = eB?.response?.data || eA?.response?.data || eB.message || eA.message;
      throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
  }
}

function parseQianfanEmbeddings(data) {
  let vectors = [];
  if (Array.isArray(data?.data)) {
    vectors = data.data.map(d => d.embedding || d.vector || d.embeddings);
  } else if (Array.isArray(data?.embeddings)) {
    vectors = data.embeddings;
  }
  if (!Array.isArray(vectors) || vectors.some(v => !Array.isArray(v))) {
    throw new Error('未知的千帆返回格式，无法解析 embedding');
  }
  return vectors;
}

async function ensureVectorStore() {
  try {
    await fsp.mkdir(VECTOR_DIR, { recursive: true });
    if (!fs.existsSync(VECTOR_FILE)) {
      const init = { version: 1, provider: PROVIDER, model: QF_MODEL, items: [] };
      await fsp.writeFile(VECTOR_FILE, JSON.stringify(init, null, 2), 'utf-8');
      log('已初始化本地向量库:', VECTOR_FILE);
    }
  } catch (e) {
    error('初始化向量库失败:', e.message);
    throw e;
  }
}

async function loadStore() {
  await ensureVectorStore();
  const raw = await fsp.readFile(VECTOR_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function saveStore(store) {
  await fsp.writeFile(VECTOR_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

// 对外：删除某个知识点的所有向量分片
exports.removeKnowledgePointFromStore = async (kpId) => {
  if (!kpId) return 0;
  try {
    const store = await loadStore();
    const before = store.items.length;
    store.items = (store.items || []).filter(item => item.kpId !== kpId);
    const removed = before - store.items.length;
    await saveStore(store);
    log(`已从向量库移除知识点 ${kpId} 的分片 ${removed} 条。`);
    return removed;
  } catch (e) {
    error('removeKnowledgePointFromStore 失败:', e.message);
    return 0;
  }
};

// 对外：为某个知识点创建或追加向量索引
// knowledgePoint: { _id, content, title? }
exports.addKnowledgePointToStore = async (knowledgePoint) => {
  try {
    if (!knowledgePoint?._id) {
      warn('缺少知识点ID，跳过索引');
      return;
    }
    const kpId = knowledgePoint._id.toString();
    const userId = (knowledgePoint.user && knowledgePoint.user.toString) ? knowledgePoint.user.toString() : (knowledgePoint.user ? String(knowledgePoint.user) : '');
    const content = knowledgePoint.content || '';
    if (!content.trim()) {
      warn(`知识点 ${kpId} 内容为空，跳过索引`);
      return;
    }

    log(`开始索引知识点 ${kpId} ...`);
    const chunks = splitText(content, V_CHUNK_SIZE, V_CHUNK_OVERLAP);
    log(`知识点分割为 ${chunks.length} 个文本块`);

    // 分批调用 embeddings，避免超长请求
    const batchSize = V_BATCH_SIZE;
    const embeddings = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const inputs = batch.map(c => c.content);
      try {
        let vectors = [];
        if (PROVIDER === 'qianfan') {
          vectors = await embedWithQianfanV2(inputs);
        } else {
          throw new Error(`不支持的向量 Provider: ${PROVIDER}`);
        }
        vectors.forEach((vec, idx) => {
          embeddings.push({
            kpId,
            chunkIndex: i + idx,
            text: batch[idx].content,
            vector: vec
          });
        });
        log(`已生成向量: ${Math.min(i + batch.length, chunks.length)}/${chunks.length}`);
      } catch (e) {
        // 不中断整个流程，记录错误并继续
        error(`第 ${i} 批次向量生成失败:`, e.response?.data || e.message);
      }
    }

    if (embeddings.length === 0) {
      warn(`知识点 ${kpId} 未生成任何向量，可能是鉴权或网络问题`);
      return;
    }

    // 载入与替换（先删除该知识点旧的向量，再追加新的，避免重复与脏数据）
    const store = await loadStore();
    const before = store.items.length;
    store.items = (store.items || []).filter(item => item.kpId !== kpId);
    const removed = before - store.items.length;
    if (removed > 0) log(`已清理知识点 ${kpId} 旧向量 ${removed} 条。`);

    const now = new Date().toISOString();
    embeddings.forEach(item => {
      store.items.push({
        id: `${kpId}#${item.chunkIndex}`,
        kpId: kpId,
        userId: userId,
        text: item.text,
        vector: item.vector,
        createdAt: now,
        title: knowledgePoint.title || ''
      });
    });
    await saveStore(store);

    log(`知识点 ${kpId} 向量已保存，共追加 ${embeddings.length} 条。`);
  } catch (e) {
    // 不阻断主业务
    error('addKnowledgePointToStore 失败:', e.message);
  }
};

// 计算余弦相似度
function cosineSim(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// 简易查询向量缓存，降低相同问题在短时间内重复嵌入导致的限流
const V_QCACHE_TTL_MS = parseInt(process.env.VEC_QCACHE_TTL_MS || '60000', 10);
const V_QCACHE_MAX = parseInt(process.env.VEC_QCACHE_MAX || '200', 10);
const qVecCache = new Map(); // key: text, value: { vec, ts }
function getCachedVec(text) {
  const rec = qVecCache.get(text);
  if (!rec) return null;
  if (Date.now() - rec.ts > V_QCACHE_TTL_MS) { qVecCache.delete(text); return null; }
  return rec.vec;
}
function setCachedVec(text, vec) {
  if (qVecCache.size >= V_QCACHE_MAX) {
    // 简单淘汰：删除最早插入的一项
    const firstKey = qVecCache.keys().next().value;
    if (firstKey) qVecCache.delete(firstKey);
  }
  qVecCache.set(text, { vec, ts: Date.now() });
}

async function embedTexts(texts) {
  if (PROVIDER === 'qianfan') {
    // 命中缓存的只对“单输入”文本生效（常见于查询问题）
    if (Array.isArray(texts) && texts.length === 1) {
      const t = texts[0];
      const cached = getCachedVec(t);
      if (cached) return [cached];
      const vecs = await embedWithQianfanV2(texts);
      if (Array.isArray(vecs) && vecs[0]) setCachedVec(t, vecs[0]);
      return vecs;
    }
    return await embedWithQianfanV2(texts);
  }
  throw new Error(`不支持的向量 Provider: ${PROVIDER}`);
}

// 对外：向量检索（返回 {text, kpId, title, score}[]）
exports.searchSimilarChunks = async (question, topK = 5, options = {}) => {
  const { allowedKpIds, minScore = 0, userId } = options || {};
  if (!question || !question.trim()) return [];
  try {
    const [store, qvecArr] = await Promise.all([
      loadStore(),
      embedTexts([question])
    ]);
    const qvec = qvecArr[0];
    if (!qvec || !Array.isArray(qvec)) return [];

    const results = [];
    for (const item of store.items || []) {
      if (userId && item.userId && item.userId !== userId) continue; // 多租户隔离
      if (Array.isArray(allowedKpIds) && allowedKpIds.length > 0 && !allowedKpIds.includes(item.kpId)) {
        continue;
      }
      const score = cosineSim(qvec, item.vector);
      if (score >= minScore) {
        results.push({
          kpId: item.kpId,
          title: item.title || '',
          text: item.text,
          score
        });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  } catch (e) {
    error('searchSimilarChunks 失败:', e.message);
    return [];
  }
};
