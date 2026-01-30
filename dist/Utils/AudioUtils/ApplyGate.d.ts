import { type InputParams, type MixerParams } from '../../Types/ParamTypes';
import { type ModifiedDataView } from '../../ModifiedDataView/ModifiedDataView';
import { type GateState } from '../State';
import { type Stats } from '../Stats/Stats';
export declare function applyGate(audioData: ModifiedDataView, params: InputParams | MixerParams, gateState: GateState, postGate: Stats): void;
