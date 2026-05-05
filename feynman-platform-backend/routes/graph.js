// routes/graph.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');

// GET /api/graph/knowledge-map
// 生成知识点间的引用关系图（简单规则：content 包含其他 kp 的 title 则认为存在引用）
router.get('/knowledge-map', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id })
      .select('_id title content status reviewList category difficulty masteryLevel stats createdAt updatedAt');

    if (!kps || kps.length === 0) {
      return res.json({ nodes: [], links: [] });
    }

    // 构建节点
    const nodes = kps.map((kp) => {
      const content = kp.content || '';
      const baseSize = 20;
      const extra = Math.min(Math.floor(content.length / 120), 16); // 内容越多节点略大
      return {
        id: kp._id.toString(),
        name: kp.title || '未命名',
        value: content.substring(0, 100),
        status: kp.status || 'not_started',
        reviewList: !!kp.reviewList,
        category: kp.category || 'general',
        difficulty: kp.difficulty || 'medium',
        masteryLevel: typeof kp.masteryLevel === 'number' ? kp.masteryLevel : 0,
        stats: kp.stats || { totalAttempts: 0, averageScore: 0, bestScore: 0, lastScore: 0 },
        symbolSize: baseSize + extra,
      };
    });

    // 映射 title -> id，便于关系查找
    const titleToId = new Map();
    kps.forEach(kp => titleToId.set(kp.title, kp._id.toString()));

    // 构建边（A.content 中包含 B.title 即 A -> B）
    const links = [];
    for (const src of kps) {
      const srcId = src._id.toString();
      const text = (src.content || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      for (const [title, tgtId] of titleToId.entries()) {
        if (tgtId === srcId) continue;
        if (!title || title.length < 2) continue; // 过短标题忽略，减少误报
        if (text.includes(title)) {
          links.push({ source: srcId, target: tgtId });
        }
      }
    }

    res.json({ nodes, links });
  } catch (e) {
    console.error('Error generating knowledge graph:', e);
    res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

module.exports = router;

