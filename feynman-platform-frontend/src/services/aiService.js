// src/services/aiService.js
import apiClient from '../api/axios';

class AIService {
    /**
     * AI评价学生的费曼复述
     * @param {string} originalContent - 原始知识点内容
     * @param {string} transcribedText - 学生复述的文本
     * @returns {Promise} 包含评价结果的对象
     */
    async evaluateFeynmanAttempt(originalContent, transcribedText) {
        try {
            console.log('🚀 发送AI评价请求...');
            
            // 修复：使用正确的 API 路径
            const response = await apiClient.post('/ai/evaluate', {
                originalContent,
                transcribedText
            });

            console.log('✅ AI评价响应:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ AI评价失败:', error);
            const errorMsg = error.response?.data?.message || error.message || 'AI评价服务暂时不可用';
            throw new Error(errorMsg);
        }
    }

    /**
     * AI文本润色
     * @param {string} text - 需要润色的文本
     * @returns {Promise<string>} 润色后的文本
     */
    async polishText(text) {
        try {
            console.log('🎨 发送文本润色请求...');
            
            // 修复：使用正确的 API 路径
            const response = await apiClient.post('/ai/polish', {
                text
            });
            
            console.log('✅ 文本润色响应:', response.data);
            return response.data.polishedText;

        } catch (error) {
            console.error('❌ 文本润色失败:', error);
            const errorMsg = error.response?.data?.message || error.message || '文本润色服务暂时不可用';
            throw new Error(errorMsg);
        }
    }
}

export default new AIService();