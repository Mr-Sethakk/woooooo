//backend/controllers/deepseekAiController.js
const axios = require('axios');

class DeepSeekAIService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.baseURL = 'https://api.deepseek.com/v1';
    }

    // 统一的API调用方法
    async callDeepSeekAPI(messages, temperature = 0.3) {
        try {
            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: "deepseek-chat",
                    messages: messages,
                    temperature: temperature,
                    max_tokens: 2000,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('DeepSeek API调用错误:', error.response?.data || error.message);
            throw new Error(`AI服务调用失败: ${error.response?.data?.message || error.message}`);
        }
    }

    // AI润色与评价的核心函数
    async evaluateFeynmanAttempt(originalContent, transcribedText) {
        // 精心设计的Prompt
        const prompt = `
你是一个严格而友善的计算机科学学习教练。你的任务是评估学生对一个知识点的复述，并给出反馈。

【原始知识点】:
\`\`\`
${originalContent}
\`\`\`

【学生的口头复述文本】:
\`\`\`
${transcribedText}
\`\`\`

请你完成以下三项任务:
1.  **文本润色**: 将学生的复述文本润色成一段通顺、专业、书面化的文字。修正明显的语法错误和口语化表达，但保持其核心观点不变。
2.  **综合评价**: 基于原始知识点，对学生的复述进行评价。指出其优点和可以改进的地方。
3.  **评分**: 综合考虑准确性、完整性、逻辑性和流畅性，给出一个0到100的整数分数。

请严格按照以下JSON格式返回你的结果，不要包含任何额外的解释或文字。
{
  "polishedText": "这里是润色后的文本",
  "evaluation": "这里是你的综合评价",
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["可以改进的地方1", "可以改进的地方2"],
  "score": 85
}
`;

        try {
            const result = await this.callDeepSeekAPI([
                {
                    role: 'user',
                    content: prompt
                }
            ]);

            // 解析返回的JSON
            const cleanedResult = result.replace(/```json\n?|\n?```/g, '').trim();
            const llmResult = JSON.parse(cleanedResult);
            
            return llmResult;
        } catch (error) {
            console.error('解析AI返回结果失败:', error);
            throw new Error('AI返回结果格式错误');
        }
    }

    // 单独的文本润色功能
    async polishText(text) {
        const prompt = `
请将以下口语化、不通顺的文本优化为流畅的书面语，保持原意不变，只做语言表达的优化：

${text}

请直接返回润色后的文本，不要添加任何解释。
`;

        const result = await this.callDeepSeekAPI([
            {
                role: 'user',
                content: prompt
            }
        ], 0.7); // 稍微提高创造性

        return result.trim();
    }

    // AI 出题功能
    async generateQuestion(knowledgePointContent, difficulty, questionType = 'single-choice') {
        let prompt;

        if (questionType === 'single-choice') {
            prompt = `
你是一个专业的计算机科学出题专家。请根据以下提供的知识点内容和指定的难度，生成一个相关的单项选择题。

【知识点内容】:
"""
${knowledgePointContent}
"""

【指定难度】: ${difficulty}  (可选值为: 基础, 中等, 困难)

请严格按照以下JSON格式返回题目，不要包含任何额外的解释或文字，确保所有字段都存在。
{
  "type": "single-choice",
  "difficulty": "${difficulty}",
  "question": "这里是题干",
  "options": {
    "A": "选项A的内容",
    "B": "选项B的内容",
    "C": "选项C的内容",
    "D": "选项D的内容"
  },
  "answer": "C",
  "explanation": "这里是对正确答案的简短解释"
}
`;
        } else if (questionType === 'short-answer') {
            prompt = `
你是一个专业的计算机科学出题专家。请根据以下提供的知识点内容和指定的难度，生成一个相关的简答题。

【知识点内容】:
"""
${knowledgePointContent}
"""

【指定难度】: ${difficulty}  (可选值为: 基础, 中等, 困难)

请严格按照以下JSON格式返回题目，不要包含任何额外的解释或文字，确保所有字段都存在。
{
  "type": "short-answer",
  "difficulty": "${difficulty}",
  "question": "这里是题干",
  "answer_key_points": [
    "关键点1",
    "关键点2",
    "关键点3"
  ]
}
`;
        }

        try {
            const result = await this.callDeepSeekAPI([
                {
                    role: 'user',
                    content: prompt
                }
            ], 0.3); // 降低创造性以确保准确性

            // 解析返回的JSON
            const cleanedResult = result.replace(/```json\n?|\n?```/g, '').trim();
            const questionData = JSON.parse(cleanedResult);
            
            return questionData;
        } catch (error) {
            console.error('解析AI返回结果失败:', error);
            throw new Error('AI返回结果格式错误');
        }
    }

    // AI 评分功能（用于简答题）
    async gradeAnswer(question, answerKeyPoints, studentAnswer) {
        const prompt = `
你是一个客观的计算机科学阅卷老师。请根据以下题目、答案要点和学生的回答，判断学生的回答是否正确，并给出解释。

【题目】:
${question}

【答案要点】:
${answerKeyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

【学生的回答】:
${studentAnswer}

请严格按照以下JSON格式返回你的评判结果，不要包含任何额外的解释或文字。
{
  "isCorrect": true,
  "explanation": "这里是你的评判理由，比如：回答基本正确，覆盖了主要区别。或：回答混淆了某些概念。",
  "score": 85
}
`;

        try {
            const result = await this.callDeepSeekAPI([
                {
                    role: 'user',
                    content: prompt
                }
            ], 0.3);

            // 解析返回的JSON
            const cleanedResult = result.replace(/```json\n?|\n?```/g, '').trim();
            const gradeData = JSON.parse(cleanedResult);
            
            return gradeData;
        } catch (error) {
            console.error('解析AI评分结果失败:', error);
            throw new Error('AI评分结果格式错误');
        }
    }
}

// 控制器函数
const deepSeekService = new DeepSeekAIService();

// AI评价函数
exports.evaluateFeynmanAttempt = async (req, res) => {
    const { originalContent, transcribedText } = req.body;
    
    if (!originalContent || !transcribedText) {
        return res.status(400).json({ 
            error: '缺少必要参数',
            message: 'originalContent 和 transcribedText 为必填项'
        });
    }
    
    try {
        const result = await deepSeekService.evaluateFeynmanAttempt(originalContent, transcribedText);
        res.json(result);
    } catch (error) {
        console.error('AI评价失败:', error);
        res.status(500).json({ 
            error: 'AI评价服务暂时不可用',
            message: error.message
        });
    }
};

// 文本润色函数
exports.polishText = async (req, res) => {
    const { text } = req.body;
    
    if (!text) {
        return res.status(400).json({ 
            error: '缺少文本内容',
            message: 'text 为必填项'
        });
    }
    
    try {
        const polishedText = await deepSeekService.polishText(text);
        res.json({ polishedText });
    } catch (error) {
        console.error('文本润色失败:', error);
        res.status(500).json({ 
            error: '文本润色服务暂时不可用',
            message: error.message
        });
    }
};

// AI 出题函数
exports.generateQuestion = async (req, res) => {
    const { knowledgePointContent, difficulty, questionType = 'single-choice' } = req.body;
    
    if (!knowledgePointContent || !difficulty) {
        return res.status(400).json({ 
            error: '缺少必要参数',
            message: 'knowledgePointContent 和 difficulty 为必填项'
        });
    }

    // 验证难度值
    const validDifficulties = ['基础', '中等', '困难'];
    if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({ 
            error: '无效的难度值',
            message: `difficulty 必须是以下之一: ${validDifficulties.join(', ')}`
        });
    }
    
    try {
        const question = await deepSeekService.generateQuestion(knowledgePointContent, difficulty, questionType);
        res.json(question);
    } catch (error) {
        console.error('AI出题失败:', error);
        res.status(500).json({ 
            error: 'AI出题服务暂时不可用',
            message: error.message
        });
    }
};

// AI 评分函数
exports.gradeAnswer = async (req, res) => {
    const { question, answerKeyPoints, studentAnswer } = req.body;
    
    if (!question || !answerKeyPoints || !studentAnswer) {
        return res.status(400).json({ 
            error: '缺少必要参数',
            message: 'question, answerKeyPoints 和 studentAnswer 为必填项'
        });
    }

    if (!Array.isArray(answerKeyPoints)) {
        return res.status(400).json({ 
            error: '参数格式错误',
            message: 'answerKeyPoints 必须是一个数组'
        });
    }
    
    try {
        const gradeResult = await deepSeekService.gradeAnswer(question, answerKeyPoints, studentAnswer);
        res.json(gradeResult);
    } catch (error) {
        console.error('AI评分失败:', error);
        res.status(500).json({ 
            error: 'AI评分服务暂时不可用',
            message: error.message
        });
    }
};