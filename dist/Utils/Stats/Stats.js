"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stats = void 0;
const GetValueRange_1 = require("../General/GetValueRange");
const ChannelStats_1 = require("./ChannelStats");
class Stats {
    constructor(bitDepth, channelLength) {
        this.currentChannel = 0;
        const maxRange = (0, GetValueRange_1.getValueRange)(bitDepth).max;
        this.channels = Array.from({ length: channelLength }, () => new ChannelStats_1.ChannelStats(maxRange));
    }
    update(sample) {
        this.channels[this.currentChannel].update(sample);
        this.currentChannel += 1;
        this.currentChannel %= this.channels.length;
    }
    reset() {
        this.channels.forEach(c => {
            c.reset();
        });
    }
}
exports.Stats = Stats;
