// utils/audioConverter.js
const wav = require('wav-decoder');
const WavEncoder = require('wav-encoder');

class AudioConverter {
    // 转换为百度API兼容的格式
    static async convertToBaiduFormat(audioBuffer) {
        try {
            console.log('开始音频格式转换...');
            
            // 解码WAV文件
            const audioData = await wav.decode(audioBuffer);
            console.log('原始音频信息:', {
                sampleRate: audioData.sampleRate,
                numberOfChannels: audioData.channelData.length,
                length: audioData.channelData[0].length,
                duration: audioData.channelData[0].length / audioData.sampleRate
            });

            // 转换为单声道
            let monoData;
            if (audioData.channelData.length > 1) {
                console.log('转换为单声道...');
                monoData = new Float32Array(audioData.channelData[0].length);
                for (let i = 0; i < audioData.channelData[0].length; i++) {
                    let sum = 0;
                    for (let channel = 0; channel < audioData.channelData.length; channel++) {
                        sum += audioData.channelData[channel][i];
                    }
                    monoData[i] = sum / audioData.channelData.length;
                }
            } else {
                monoData = audioData.channelData[0];
            }

            // 重新采样到16000Hz（如果需要）
            let resampledData = monoData;
            if (audioData.sampleRate !== 16000) {
                console.log(`采样率转换: ${audioData.sampleRate}Hz -> 16000Hz`);
                resampledData = this.resample(monoData, audioData.sampleRate, 16000);
            }

            // 转换为16位PCM
            console.log('转换为16位PCM...');
            const pcmBuffer = this.floatTo16BitPCM(resampledData);
            
            console.log('转换后音频信息:', {
                sampleRate: 16000,
                length: pcmBuffer.length,
                duration: pcmBuffer.length / 32000 // 16kHz, 16bit = 32000 bytes/sec
            });

            return pcmBuffer;

        } catch (error) {
            console.error('音频转换错误:', error);
            throw error;
        }
    }

    // 重采样
    static resample(input, originalSampleRate, targetSampleRate) {
        if (originalSampleRate === targetSampleRate) {
            return input;
        }

        const ratio = originalSampleRate / targetSampleRate;
        const newLength = Math.round(input.length / ratio);
        const result = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const index = i * ratio;
            const leftIndex = Math.floor(index);
            const rightIndex = Math.min(leftIndex + 1, input.length - 1);
            const fraction = index - leftIndex;

            result[i] = input[leftIndex] * (1 - fraction) + input[rightIndex] * fraction;
        }

        return result;
    }

    // 浮点数转16位PCM
    static floatTo16BitPCM(input) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return Buffer.from(output.buffer);
    }
}

module.exports = AudioConverter;