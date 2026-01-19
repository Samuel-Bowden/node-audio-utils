"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDownwardCompressor = applyDownwardCompressor;
const IsLittleEndian_1 = require("../General/IsLittleEndian");
const GetMethodName_1 = require("../General/GetMethodName");
const ConvertThreshold_1 = require("../General/ConvertThreshold");
function applyDownwardCompressor(audioData, params, downwardCompressorState) {
    const bytesPerElement = params.bitDepth / 8;
    const isLe = (0, IsLittleEndian_1.isLittleEndian)(params.endianness);
    const { upperThreshold, lowerThreshold, equilibrium } = (0, ConvertThreshold_1.convertThreshold)(params.bitDepth, params.unsigned, params.downwardCompressorThreshold);
    const getSampleMethod = `get${(0, GetMethodName_1.getMethodName)(params.bitDepth, params.unsigned)}`;
    const setSampleMethod = `set${(0, GetMethodName_1.getMethodName)(params.bitDepth, params.unsigned)}`;
    const ratio = params.downwardCompressorRatio ?? Number.MAX_SAFE_INTEGER;
    for (let index = 0; index < audioData.byteLength; index += bytesPerElement) {
        const sample = audioData[getSampleMethod](index, isLe);
        const threshold = sample >= equilibrium ? upperThreshold : lowerThreshold;
        if (sample > upperThreshold || sample < lowerThreshold) {
            if (params.downwardCompressorAttackSamples === undefined) {
                downwardCompressorState.ratio = ratio;
            }
            else {
                downwardCompressorState.ratio = Math.min(downwardCompressorState.ratio + (ratio / params.downwardCompressorAttackSamples), ratio);
            }
        }
        else if (params.downwardCompressorReleaseSamples === undefined) {
            downwardCompressorState.ratio = 1;
        }
        else {
            downwardCompressorState.ratio = Math.max(downwardCompressorState.ratio - (ratio / params.downwardCompressorReleaseSamples), 1);
        }
        audioData[setSampleMethod](index, ((sample - threshold) / downwardCompressorState.ratio) + threshold, isLe);
    }
}
