import { type InputParams, type MixerParams } from '../../Types/ParamTypes';
import { type ModifiedDataView } from '../../ModifiedDataView/ModifiedDataView';
import { type Stats } from '../Stats/Stats';
export declare function updateStats(audioData: ModifiedDataView, params: InputParams | MixerParams, stats: Stats): void;
