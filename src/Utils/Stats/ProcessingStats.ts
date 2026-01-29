import {type BitDepth} from '../../Types/AudioTypes';
import {Stats} from './Stats';

export class ProcessingStats {
	public readonly preProcess: Stats;
	public readonly postDownwardCompressor: Stats;
	public readonly postGate: Stats;

	constructor(bitDepth: BitDepth, channelLength: number) {
		this.preProcess = new Stats(bitDepth, channelLength);
		this.postDownwardCompressor = new Stats(bitDepth, channelLength);
		this.postGate = new Stats(bitDepth, channelLength);
	}

	public reset() {
		this.preProcess.reset();
		this.postDownwardCompressor.reset();
		this.postGate.reset();
	}
}
