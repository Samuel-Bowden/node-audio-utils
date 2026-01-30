import { type MixerParams, type InputParams, type OmitSomeParams } from '../Types/ParamTypes';
import { Readable } from 'stream';
import { AudioInput } from '../AudioInput/AudioInput';
import { type ProcessingStats } from '../Utils/Stats/ProcessingStats';
export declare class AudioMixer extends Readable {
    private readonly mixerParams;
    private readonly audioUtils;
    private readonly inputs;
    constructor(params: MixerParams);
    get params(): Readonly<MixerParams>;
    set params(params: OmitSomeParams<MixerParams>);
    get processingStats(): ProcessingStats;
    _read(): void;
    _destroy(error: Error, callback: (error?: Error) => void): void;
    createAudioInput(inputParams: InputParams): AudioInput;
    removeAudioinput(audioInput: AudioInput): boolean;
}
