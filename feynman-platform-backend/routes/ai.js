const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { evaluateFeynmanAttempt, polishText, generateQuestion, gradeAnswer } = require('../controllers/deepseekAiController');

// @route POST /api/ai/evaluate
// @desc AI评价学生的费曼复述
// @access Private
router.post('/evaluate', auth, evaluateFeynmanAttempt);

// @route POST /api/ai/polish
// @desc AI文本润色
// @access Private
router.post('/polish', auth, polishText);

// @route POST /api/ai/generate-question
// @desc AI动态生成题目
// @access Private
router.post('/generate-question', auth, generateQuestion);

// @route POST /api/ai/grade-answer
// @desc AI评分学生答案（用于简答题）
// @access Private
router.post('/grade-answer', auth, gradeAnswer);

module.exports = router;