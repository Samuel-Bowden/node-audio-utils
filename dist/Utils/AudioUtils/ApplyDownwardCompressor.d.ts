import { type InputParams, type MixerParams } from '../../Types/ParamTypes';
import { type ModifiedDataView } from '../../ModifiedDataView/ModifiedDataView';
import { type DownwardCompressorState } from '../State';
export declare function applyDownwardCompressor(audioData: ModifiedDataView, params: InputParams | MixerParams, downwardCompressorState: DownwardCompressorState): void;
