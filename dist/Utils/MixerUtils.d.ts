import { type AudioUtils } from '../Types/AudioUtils';
import { type MixerParams } from '../Types/ParamTypes';
import { ProcessingStats } from './Stats/ProcessingStats';
export declare class MixerUtils implements AudioUtils {
    readonly processingStats: ProcessingStats;
    private readonly audioMixerParams;
    private changedParams;
    private dataCollection;
    private readonly emptyData;
    private mixedData;
    private readonly gateState;
    private readonly downwardCompressorState;
    constructor(mixerParams: MixerParams);
    setAudioData(audioData: Uint8Array[]): this;
    mix(): this;
    checkPreProcessVolume(): this;
    checkPostProcessVolume(): this;
    updatePreProcessStats(): this;
    applyGate(): this;
    applyDownwardCompressor(): this;
    getAudioData(): Uint8Array;
}
