const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { answerQuestion } = require('../services/ragService');
const { addKnowledgePointToStore, removeKnowledgePointFromStore } = require('../services/vectorStoreService');
const KnowledgePoint = require('../models/KnowledgePoint');
const fs = require('fs');
const path = require('path');

// POST /api/rag/query
// body: { question: string, topK?: number, filterKpIds?: string[], minScore?: number }
router.post('/query', auth, async (req, res) => {
  try {
    const { question, topK, filterKpIds, minScore } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: '缺少或非法的 question' });
    }
    const result = await answerQuestion({
      question,
      topK: typeof topK === 'number' ? topK : 5,
      filterKpIds: Array.isArray(filterKpIds) ? filterKpIds : [],
      minScore: typeof minScore === 'number' ? minScore : 0.2,
      userId: req.user.id,
    });
    res.json(result);
  } catch (e) {
    console.error('[RAG] /query 失败:', e);
    res.status(500).json({ error: 'RAG 查询失败', message: e.message });
  }
});

// GET /api/rag/index/status - 查看索引状态（含当前用户维度）
router.get('/index/status', auth, async (req, res) => {
  try {
    const vectorFile = path.join(__dirname, '../vector_store/index.json');
    if (!fs.existsSync(vectorFile)) {
      return res.json({ exists: false, totalItems: 0, userItems: 0, byKp: {}, provider: process.env.EMBEDDINGS_PROVIDER || 'qianfan', model: process.env.QIANFAN_V2_MODEL || 'embedding-v1' });
    }
    const raw = fs.readFileSync(vectorFile, 'utf-8');
    const store = JSON.parse(raw || '{}');
    const items = Array.isArray(store.items) ? store.items : [];
    const totalItems = items.length;
    const userId = req.user.id;
    const userItems = items.filter(x => !x.userId || x.userId === userId);
    const byKp = {};
    userItems.forEach(x => { byKp[x.kpId] = (byKp[x.kpId] || 0) + 1; });
    res.json({ exists: true, totalItems, userItems: userItems.length, byKp, provider: store.provider, model: store.model });
  } catch (e) {
    console.error('[RAG] /index/status 失败:', e);
    res.status(500).json({ error: '获取索引状态失败', message: e.message });
  }
});

// POST /api/rag/index/rebuild - 重新为当前用户的知识点构建索引
router.post('/index/rebuild', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id });
    // 可选批量限制与间隔（毫秒）
    const limit = Math.max(0, parseInt(req.query.limit || '0', 10));
    const interval = Math.max(0, parseInt(process.env.REBUILD_INTERVAL_MS || '800', 10));

    const list = limit > 0 ? kps.slice(0, limit) : kps;
    let success = 0, fail = 0;

    for (const kp of list) {
      try {
        await addKnowledgePointToStore(kp);
        success++;
      } catch (err) {
        console.error('[RAG] 重建单个KP失败:', kp._id?.toString?.() || kp._id, err?.message || err);
        fail++;
      }
      if (interval > 0) {
        await new Promise(r => setTimeout(r, interval));
      }
    }

    res.json({ message: '重建完成', total: list.length, success, fail, interval });
  } catch (e) {
    console.error('[RAG] /index/rebuild 失败:', e);
    res.status(500).json({ error: '重建索引失败', message: e.message });
  }
});

module.exports = router;

