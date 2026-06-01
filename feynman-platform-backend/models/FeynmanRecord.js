// backend/models/FeynmanRecord.js
const mongoose = require('mongoose');

const FeynmanRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    knowledgePointId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'KnowledgePoint',
        required: true
    },
    transcript: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['speech', 'text'],
        default: 'speech'
    },
    clarityScore: {
        type: Number,
        min: 0,
        max: 100
    },
    completenessScore: {
        type: Number,
        min: 0,
        max: 100
    },
    duration: {
        type: Number, // 录音时长（秒）
        min: 0
    }
}, {
    timestamps: true
});

// 添加索引以提高查询性能
FeynmanRecordSchema.index({ userId: 1, knowledgePointId: 1 });
FeynmanRecordSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FeynmanRecord', FeynmanRecordSchema);