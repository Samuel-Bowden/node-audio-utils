"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioStats = void 0;
const stream_1 = require("stream");
const ModifiedDataView_1 = require("../ModifiedDataView/ModifiedDataView");
const IsLittleEndian_1 = require("../Utils/General/IsLittleEndian");
const GetMethodName_1 = require("../Utils/General/GetMethodName");
const Stats_1 = require("../Utils/Stats/Stats");
class AudioStats extends stream_1.Writable {
    constructor(statsParams) {
        super();
        this.statsParams = statsParams;
        this.stats = new Stats_1.Stats(this.statsParams.bitDepth, this.statsParams.channels);
    }
    reset() {
        this.stats.reset();
    }
    _write(chunk, _, callback) {
        const audioData = new ModifiedDataView_1.ModifiedDataView(chunk.buffer, chunk.byteOffset, chunk.length);
        const bytesPerElement = this.statsParams.bitDepth / 8;
        const isLe = (0, IsLittleEndian_1.isLittleEndian)(this.statsParams.endianness);
        const getSampleMethod = `get${(0, GetMethodName_1.getMethodName)(this.statsParams.bitDepth, this.statsParams.unsigned)}`;
        for (let index = 0; index < audioData.byteLength; index += bytesPerElement) {
            const sample = audioData[getSampleMethod](index, isLe);
            this.stats.update(sample);
        }
        callback();
    }
}
exports.AudioStats = AudioStats;
