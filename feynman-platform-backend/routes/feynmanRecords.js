// backend/routes/feynmanRecords.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FeynmanRecord = require('../models/FeynmanRecord');

// @route POST /api/feynman-records
// @desc 保存费曼记录
// @access Private
router.post('/', auth, async (req, res) => {
    try {
        const { knowledgePointId, transcript, type } = req.body;

        // 验证必要字段
        if (!knowledgePointId || !transcript) {
            return res.status(400).json({ 
                msg: '缺少必要字段: knowledgePointId 和 transcript' 
            });
        }

        const record = new FeynmanRecord({
            userId: req.user.id,
            knowledgePointId,
            transcript,
            type: type || 'speech'
        });

        await record.save();
        res.json({ 
            msg: '记录保存成功', 
            record: {
                id: record._id,
                transcript: record.transcript,
                type: record.type,
                createdAt: record.createdAt
            }
        });
    } catch (error) {
        console.error('保存记录错误:', error);
        res.status(500).json({ msg: '服务器错误' });
    }
});

// @route GET /api/feynman-records/knowledge-point/:id
// @desc 获取指定知识点的所有费曼记录
// @access Private
router.get('/knowledge-point/:id', auth, async (req, res) => {
    try {
        const records = await FeynmanRecord.find({
            knowledgePointId: req.params.id,
            userId: req.user.id
        }).sort({ createdAt: -1 });

        res.json(records);
    } catch (error) {
        console.error('获取记录错误:', error);
        res.status(500).json({ msg: '服务器错误' });
    }
});

module.exports = router;