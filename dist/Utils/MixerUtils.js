"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MixerUtils = void 0;
const _hangeVolume_1 = require("./AudioUtils/\u0421hangeVolume");
const ApplyGate_1 = require("./AudioUtils/ApplyGate");
const ApplyDownwardCompressor_1 = require("./AudioUtils/ApplyDownwardCompressor");
const ModifiedDataView_1 = require("../ModifiedDataView/ModifiedDataView");
const MixAudioData_1 = require("./General/MixAudioData");
const ProcessingStats_1 = require("./Stats/ProcessingStats");
const UpdateStats_1 = require("./AudioUtils/UpdateStats");
class MixerUtils {
    constructor(mixerParams) {
        this.dataCollection = [];
        this.emptyData = new Uint8Array(0);
        this.audioMixerParams = mixerParams;
        this.changedParams = { ...this.audioMixerParams };
        this.mixedData = new ModifiedDataView_1.ModifiedDataView(this.emptyData.buffer);
        this.gateState = { holdSamplesRemaining: mixerParams.gateHoldSamples, attenuation: 1 };
        this.downwardCompressorState = { ratio: 1 };
        this.processingStats = new ProcessingStats_1.ProcessingStats(mixerParams.bitDepth, mixerParams.channels);
    }
    setAudioData(audioData) {
        this.dataCollection = audioData.map((audioData) => new ModifiedDataView_1.ModifiedDataView(audioData.buffer));
        this.changedParams = { ...this.audioMixerParams };
        return this;
    }
    mix() {
        if (this.dataCollection.length > 1) {
            this.mixedData = (0, MixAudioData_1.mixAudioData)(this.dataCollection, this.changedParams);
        }
        else {
            this.mixedData = new ModifiedDataView_1.ModifiedDataView(this.dataCollection[0].buffer);
        }
        return this;
    }
    checkPreProcessVolume() {
        const preProcessVolume = this.audioMixerParams.preProcessVolume ?? 100;
        if (preProcessVolume !== 100) {
            (0, _hangeVolume_1.changeVolume)(this.mixedData, this.changedParams, preProcessVolume);
        }
        return this;
    }
    checkPostProcessVolume() {
        const postProcessVolume = this.audioMixerParams.postProcessVolume ?? 100;
        if (postProcessVolume !== 100) {
            (0, _hangeVolume_1.changeVolume)(this.mixedData, this.changedParams, postProcessVolume);
        }
        return this;
    }
    updatePreProcessStats() {
        (0, UpdateStats_1.updateStats)(this.mixedData, this.changedParams, this.processingStats.preProcess);
        return this;
    }
    applyGate() {
        if (this.audioMixerParams.gateThreshold !== undefined) {
            (0, ApplyGate_1.applyGate)(this.mixedData, this.changedParams, this.gateState, this.processingStats.postGate);
        }
        return this;
    }
    applyDownwardCompressor() {
        if (this.audioMixerParams.downwardCompressorThreshold !== undefined) {
            (0, ApplyDownwardCompressor_1.applyDownwardCompressor)(this.mixedData, this.changedParams, this.downwardCompressorState, this.processingStats.postDownwardCompressor);
        }
        return this;
    }
    getAudioData() {
        return new Uint8Array(this.mixedData.buffer);
    }
}
exports.MixerUtils = MixerUtils;
