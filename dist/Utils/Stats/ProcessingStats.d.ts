import { type BitDepth } from '../../Types/AudioTypes';
import { Stats } from './Stats';
export declare class ProcessingStats {
    readonly preProcess: Stats;
    readonly postDownwardCompressor: Stats;
    readonly postGate: Stats;
    constructor(bitDepth: BitDepth, channelLength: number);
    reset(): void;
}
