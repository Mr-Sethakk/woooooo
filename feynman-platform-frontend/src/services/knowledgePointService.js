// src/services/knowledgePointService.js
import apiClient from '../api/axios';

class KnowledgePointService {
    /**
     * 更新知识点学习状态
     * @param {string} knowledgePointId - 知识点ID
     * @param {number} score - AI评价分数
     * @param {object} feedback - AI反馈数据
     * @param {string} transcript - 用户的复述文本
     * @returns {Promise} 更新结果
     */
    async updateKnowledgeStatus(knowledgePointId, score, feedback, transcript) {
        try {
            console.log('📤 发送知识点状态更新请求:', { 
                knowledgePointId, 
                score,
                feedbackKeys: Object.keys(feedback || {})
            });
            
            const response = await apiClient.put(
                `/knowledge-points/${knowledgePointId}/update-status`,
                {
                    score,
                    feedback,
                    transcript
                }
            );
            
            console.log('✅ 知识点状态更新响应:', response.data);
            return response.data;
            
        } catch (error) {
            console.error('❌ 更新知识点状态失败:', error);
            const errorMsg = error.response?.data?.message || error.message || '更新知识点状态失败';
            throw new Error(errorMsg);
        }
    }

    /**
     * 获取需要复习的知识点列表
     * @returns {Promise} 复习列表
     */
    async getReviewList() {
        try {
            console.log('📥 获取复习列表...');
            const response = await apiClient.get('/knowledge-points/review/list');
            console.log('✅ 复习列表响应:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ 获取复习列表失败:', error);
            throw new Error(error.response?.data?.message || '获取复习列表失败');
        }
    }

    /**
     * 获取知识点的学习统计信息
     * @param {string} knowledgePointId - 知识点ID
     * @returns {Promise} 学习统计信息
     */
    async getKnowledgeStats(knowledgePointId) {
        try {
            console.log('📊 获取知识点统计信息:', knowledgePointId);
            const response = await apiClient.get(`/knowledge-points/${knowledgePointId}/stats`);
            console.log('✅ 知识点统计信息响应:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ 获取知识点统计信息失败:', error);
            throw new Error(error.response?.data?.message || '获取统计信息失败');
        }
    }

    /**
     * 获取用户学习概览
     * @returns {Promise} 学习概览数据
     */
    async getLearningOverview() {
        try {
            console.log('📈 获取学习概览...');
            const response = await apiClient.get('/knowledge-points/overview');
            console.log('✅ 学习概览响应:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ 获取学习概览失败:', error);
            throw new Error(error.response?.data?.message || '获取学习概览失败');
        }
    }
}

export default new KnowledgePointService();