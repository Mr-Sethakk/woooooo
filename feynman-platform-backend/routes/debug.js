const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');
const { addKnowledgePointToStore } = require('../services/vectorStoreService');

const VECTOR_FILE = path.join(__dirname, '../vector_store/index.json');

// 仅限已登录用户访问，避免敏感信息泄露
router.get('/vector-store', auth, async (req, res) => {
  try {
    if (!fs.existsSync(VECTOR_FILE)) {
      return res.json({ exists: false, items: 0, kps: 0, latestAt: null });
    }
    const raw = await fsp.readFile(VECTOR_FILE, 'utf-8');
    const store = JSON.parse(raw || '{}');
    const items = Array.isArray(store.items) ? store.items : [];
    const kpSet = new Set(items.map(i => i.kpId));
    const latestAt = items.reduce((acc, cur) => {
      const t = cur.createdAt ? new Date(cur.createdAt).getTime() : 0;
      return t > acc ? t : acc;
    }, 0);
    res.json({ exists: true, items: items.length, kps: kpSet.size, latestAt: latestAt ? new Date(latestAt).toISOString() : null });
  } catch (e) {
    console.error('[DEBUG] vector-store 读取失败:', e.message);
    res.status(500).json({ error: '读取失败', message: e.message });
  }
});

router.post('/reindex-all', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id }).sort({ updatedAt: -1 });
    let ok = 0, fail = 0;
    for (const kp of kps) {
      try {
        // 顺序处理，避免速率限制；如需更快可并发
        /* eslint-disable no-await-in-loop */
        await addKnowledgePointToStore(kp);
        ok++;
      } catch (e) {
        fail++;
        console.error('[DEBUG] 重建索引失败:', kp._id, e.message);
      }
    }
    res.json({ message: '重建完成', total: kps.length, ok, fail });
  } catch (e) {
    console.error('[DEBUG] /reindex-all 失败:', e.message);
    res.status(500).json({ error: '重建失败', message: e.message });
  }
});

module.exports = router;

