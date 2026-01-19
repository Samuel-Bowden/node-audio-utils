import { type InputParams, type MixerParams } from '../../Types/ParamTypes';
import { type ModifiedDataView } from '../../ModifiedDataView/ModifiedDataView';
import { type GateState } from '../State';
export declare function applyGate(audioData: ModifiedDataView, params: InputParams | MixerParams, gateState: GateState): void;
