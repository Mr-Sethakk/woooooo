// models/KnowledgePoint.js
const mongoose = require('mongoose');

const KnowledgePointSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'mastered', 'review'], // 🆕 添加 review 状态
        default: 'not_started'
    },
    reviewList: {
        type: Boolean,
        default: false
    },
    // 🆕 新增学习管理字段（向后兼容）
    category: {
        type: String,
        default: 'general'
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    masteryLevel: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    lastReviewed: {
        type: Date,
        default: null
    },
    nextReviewDate: {
        type: Date,
        default: null
    },
    // 🆕 学习历史记录
    learningHistory: [{
        date: { 
            type: Date, 
            default: Date.now 
        },
        score: {
            type: Number,
            min: 0,
            max: 100
        },
        feedback: {
            type: mongoose.Schema.Types.Mixed // 存储任意类型的AI反馈数据
        },
        type: {
            type: String,
            enum: ['speech', 'text', 'quiz'],
            default: 'speech'
        },
        transcript: {
            type: String,
            default: ''
        }
    }],
    // 🆕 学习统计
    stats: {
        totalAttempts: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            default: 0
        },
        bestScore: {
            type: Number,
            default: 0
        },
        lastScore: {
            type: Number,
            default: 0
        }
    }
}, { 
    timestamps: true 
});

// 🆕 添加实例方法
KnowledgePointSchema.methods.updateLearningStats = function(score) {
    this.stats.totalAttempts += 1;
    this.stats.lastScore = score;
    
    if (score > this.stats.bestScore) {
        this.stats.bestScore = score;
    }
    
    // 更新平均分
    const totalScore = (this.stats.averageScore * (this.stats.totalAttempts - 1)) + score;
    this.stats.averageScore = totalScore / this.stats.totalAttempts;
    
    return this.save();
};

// 🆕 添加静态方法
KnowledgePointSchema.statics.findByStatus = function(status, userId) {
    return this.find({ 
        user: userId,
        status: status 
    }).sort({ updatedAt: -1 });
};

KnowledgePointSchema.statics.getReviewList = function(userId) {
    return this.find({ 
        user: userId,
        $or: [
            { reviewList: true },
            { status: 'review' }
        ]
    }).sort({ nextReviewDate: 1 });
};

module.exports = mongoose.model('KnowledgePoint', KnowledgePointSchema);