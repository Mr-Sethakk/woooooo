// D:\FEYNMAN-PLATFORM-BACKEND\routes\knowledgePoints.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');
const { addKnowledgePointToStore, removeKnowledgePointFromStore } = require('../services/vectorStoreService');

console.log('✅ KnowledgePoints router loaded');

// ============================================
// 🔥 重要：路由顺序从上到下匹配
// 特定路由在前，通用路由在后！
// ============================================

// @route   POST /api/knowledge-points
// @desc    创建一个新的知识点
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { title, content } = req.body;
        const newKp = new KnowledgePoint({
            title,
            content,
            user: req.user.id
        });
        const kp = await newKp.save();

        // 异步生成向量索引（不阻塞响应）
        try {
            addKnowledgePointToStore(kp).catch(e => {
                console.error('创建知识点后索引失败:', e.message);
            });
        } catch (e) {
            console.error('触发向量索引时出错:', e.message);
        }

        res.json(kp);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/knowledge-points
// @desc    获取当前用户的所有知识点
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const kps = await KnowledgePoint.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(kps);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 🆕 新增：获取用户的学习概览（必须在 /:id 之前！）
// @route   GET /api/knowledge-points/overview
// @desc    获取用户的学习概览统计
// @access  Private
router.get('/overview', auth, async (req, res) => {
    try {
        const kps = await KnowledgePoint.find({ user: req.user.id });
        
        const overview = {
            total: kps.length,
            mastered: kps.filter(kp => kp.status === 'mastered').length,
            inProgress: kps.filter(kp => kp.status === 'in_progress').length,
            needReview: kps.filter(kp => kp.status === 'review' || kp.reviewList).length,
            notStarted: kps.filter(kp => kp.status === 'not_started').length,
            averageMastery: kps.length > 0 ? 
                kps.reduce((sum, kp) => sum + (kp.masteryLevel || 0), 0) / kps.length : 0
        };

        console.log('📊 返回学习概览:', overview);
        res.json(overview);
    } catch (err) {
        console.error('获取学习概览错误:', err);
        res.status(500).send('Server Error');
    }
});

// 🆕 新增：获取需要复习的知识点
// @route   GET /api/knowledge-points/review/list
// @desc    获取需要复习的知识点列表
// @access  Private
router.get('/review/list', auth, async (req, res) => {
    try {
        const reviewKps = await KnowledgePoint.find({ 
            user: req.user.id,
            reviewList: true 
        }).sort({ nextReviewDate: 1 });
        
        res.json(reviewKps);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 🆕 新增：获取学习统计信息
// @route   GET /api/knowledge-points/:id/stats
// @desc    获取知识点的学习统计信息
// @access  Private
router.get('/:id/stats', auth, async (req, res) => {
    try {
        const kp = await KnowledgePoint.findById(req.params.id);
        
        if (!kp) {
            return res.status(404).json({ msg: 'Knowledge point not found' });
        }

        if (kp.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        res.json({
            stats: kp.stats || {},
            learningHistory: (kp.learningHistory || []).slice(-10),
            masteryLevel: kp.masteryLevel || 0
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/knowledge-points/:id
// @desc    获取单个知识点详情
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        console.log('获取单个知识点，ID:', req.params.id);
        
        const kp = await KnowledgePoint.findById(req.params.id);
        console.log('查询结果:', kp);
        
        if (!kp) {
            return res.status(404).json({ msg: 'Knowledge point not found' });
        }
        
        if (kp.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        
        res.json(kp);
        
    } catch (err) {
        console.error('获取单个知识点错误:', err);
        
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Knowledge point not found' });
        }
        
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/knowledge-points/:id
// @desc    更新一个知识点
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        let kp = await KnowledgePoint.findById(req.params.id);
        if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
        
        if (kp.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        
        const oldContent = kp.content;
        const { title, content, status, reviewList } = req.body;
        kp = await KnowledgePoint.findByIdAndUpdate(
            req.params.id,
            { $set: { title, content, status, reviewList } },
            { new: true }
        );

        // 内容变更时异步触发重新索引
        if (typeof content === 'string' && content !== oldContent) {
            try {
                addKnowledgePointToStore(kp).catch(e => {
                    console.error('更新知识点后索引失败:', e.message);
                });
            } catch (e) {
                console.error('触发更新向量索引时出错:', e.message);
            }
        }

        res.json(kp);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 🆕 新增：根据AI评价更新知识点状态
// @route   PUT /api/knowledge-points/:id/update-status
// @desc    根据AI评价分数更新知识点学习状态
// @access  Private
router.put('/:id/update-status', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { score, feedback, transcript } = req.body;

        console.log('更新知识点状态请求:', { id, score });

        // 验证分数
        if (typeof score !== 'number' || score < 0 || score > 100) {
            return res.status(400).json({ 
                error: '无效的分数',
                message: '分数必须在0-100之间'
            });
        }

        // 查找知识点
        const knowledgePoint = await KnowledgePoint.findById(id);
        
        if (!knowledgePoint) {
            return res.status(404).json({ 
                error: '知识点不存在',
                message: '未找到对应的知识点'
            });
        }

        // 确保是该用户自己的知识点
        if (knowledgePoint.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // 根据分数智能更新状态（兼容新旧状态值）
        let newStatus = knowledgePoint.status;
        let reviewList = knowledgePoint.reviewList || false;
        let masteryLevel = knowledgePoint.masteryLevel || 0;

        if (score >= 85) {
            // 优秀：标记为已掌握
            newStatus = 'mastered';
            reviewList = false;
            masteryLevel = Math.min(100, masteryLevel + 20);
        } else if (score >= 70) {
            // 良好：继续学习
            newStatus = 'in_progress';
            reviewList = false;
            masteryLevel = Math.min(90, masteryLevel + 10);
        } else if (score >= 60) {
            // 及格：需要复习
            newStatus = 'review';
            reviewList = true;
            masteryLevel = Math.max(30, masteryLevel - 5);
        } else {
            // 不及格：重点复习
            newStatus = 'review';
            reviewList = true;
            masteryLevel = Math.max(10, masteryLevel - 15);
        }

        // 计算下一次复习日期
        const nextReviewDate = calculateNextReviewDate(score);

        // 添加学习记录
        const learningRecord = {
            date: new Date(),
            score: score,
            feedback: feedback,
            type: 'speech',
            transcript: transcript || ''
        };

        // 更新知识点
        const updatedPoint = await KnowledgePoint.findByIdAndUpdate(
            id,
            {
                status: newStatus,
                reviewList: reviewList,
                masteryLevel: masteryLevel,
                lastReviewed: new Date(),
                nextReviewDate: nextReviewDate,
                $push: { learningHistory: learningRecord }
            },
            { new: true }
        );

        // 生成学习表现分析
        const analysis = getPerformanceAnalysis(score, feedback);

        res.json({
            message: '知识点状态更新成功',
            knowledgePoint: {
                id: updatedPoint._id,
                title: updatedPoint.title,
                status: updatedPoint.status,
                reviewList: updatedPoint.reviewList,
                masteryLevel: updatedPoint.masteryLevel,
                nextReviewDate: updatedPoint.nextReviewDate
            },
            analysis: analysis
        });

    } catch (error) {
        console.error('更新知识点状态失败:', error);
        
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Knowledge point not found' });
        }
        
        res.status(500).json({ 
            error: '服务器错误',
            message: '更新知识点状态失败'
        });
    }
});

// @route   DELETE /api/knowledge-points/:id
// @desc    删除一个知识点
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const kp = await KnowledgePoint.findById(req.params.id);
        if (!kp) return res.status(404).json({ msg: 'Knowledge point not found' });
        if (kp.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        
        await KnowledgePoint.findByIdAndDelete(req.params.id);
        
        // 异步删除向量索引（不阻塞响应）
        removeKnowledgePointFromStore(req.params.id).catch(e => {
            console.error('删除知识点后清理向量索引失败:', e.message);
        });
        
        res.json({ msg: 'Knowledge point removed' });
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 🆕 辅助函数：计算下一次复习日期
function calculateNextReviewDate(score) {
    const now = new Date();
    let daysToAdd = 1; // 默认1天后复习

    if (score >= 90) {
        daysToAdd = 7; // 优秀：7天后复习
    } else if (score >= 80) {
        daysToAdd = 3; // 良好：3天后复习
    } else if (score >= 70) {
        daysToAdd = 2; // 及格：2天后复习
    }
    // 不及格：1天后复习（默认值）

    now.setDate(now.getDate() + daysToAdd);
    return now;
}

// 🆕 辅助函数：生成学习表现分析
function getPerformanceAnalysis(score, feedback) {
    let level, suggestion;

    if (score >= 85) {
        level = '优秀';
        suggestion = '您已经很好地掌握了这个知识点，可以挑战更难的内容了！';
    } else if (score >= 70) {
        level = '良好';
        suggestion = '理解基本到位，建议关注细节和深度理解。';
    } else if (score >= 60) {
        level = '需要复习';
        suggestion = '有些概念还不够清晰，建议重新学习并再次尝试。';
    } else {
        level = '重点复习';
        suggestion = '需要重点复习这个知识点，建议从基础概念重新开始。';
    }

    return {
        level: level,
        score: score,
        suggestion: suggestion,
        nextAction: getNextAction(score)
    };
}

// 🆕 辅助函数：获取下一步学习行动
function getNextAction(score) {
    if (score >= 85) return 'advance';  // 进阶学习
    if (score >= 70) return 'practice'; // 继续练习
    if (score >= 60) return 'review';   // 需要复习
    return 'relearn';                   // 重新学习
}

module.exports = router;