"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingStats = void 0;
const Stats_1 = require("./Stats");
class ProcessingStats {
    constructor(bitDepth, channelLength) {
        this.preProcess = new Stats_1.Stats(bitDepth, channelLength);
        this.postDownwardCompressor = new Stats_1.Stats(bitDepth, channelLength);
        this.postGate = new Stats_1.Stats(bitDepth, channelLength);
    }
    reset() {
        this.preProcess.reset();
        this.postDownwardCompressor.reset();
        this.postGate.reset();
    }
}
exports.ProcessingStats = ProcessingStats;
