"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelStats = void 0;
class ChannelStats {
    constructor(maxRange) {
        this.sumOfSquares = 0;
        this.count = 0;
        this.peakValue = 0;
        this.maxRange = maxRange;
    }
    update(sample) {
        this.sumOfSquares += sample ** 2;
        this.count += 1;
        this.peakValue = Math.max(this.peakValue, Math.abs(sample));
    }
    get rootMeanSquare() {
        if (this.count === 0) {
            return undefined;
        }
        return Math.sqrt(this.sumOfSquares / this.count) / this.maxRange;
    }
    get peak() {
        if (this.count === 0) {
            return undefined;
        }
        return this.peakValue / this.maxRange;
    }
    reset() {
        this.sumOfSquares = 0;
        this.count = 0;
        this.peakValue = 0;
    }
}
exports.ChannelStats = ChannelStats;
