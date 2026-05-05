// src/services/ragService.js
import apiClient from '../api/axios';

const ragService = {
  async query({ question, topK = 5, filterKpIds = [], minScore = 0.2 }) {
    const { data } = await apiClient.post('/rag/query', {
      question,
      topK,
      filterKpIds,
      minScore,
    });
    return data; // { answer, sources: [{index,kpId,title,score,preview}...] }
  },
};

export default ragService;

