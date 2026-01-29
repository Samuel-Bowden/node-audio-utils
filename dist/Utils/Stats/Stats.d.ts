import { type BitDepth } from '../../Types/AudioTypes';
import { ChannelStats } from './ChannelStats';
export declare class Stats {
    readonly channels: ChannelStats[];
    private currentChannel;
    constructor(bitDepth: BitDepth, channelLength: number);
    update(sample: number): void;
    reset(): void;
}
