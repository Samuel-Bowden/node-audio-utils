import {Writable} from 'stream';
import {type StatsParams} from '../Types/ParamTypes';
import {ModifiedDataView} from '../ModifiedDataView/ModifiedDataView';
import {isLittleEndian} from '../Utils/General/IsLittleEndian';
import {type BitDepth, type IntType} from '../Types/AudioTypes';
import {getMethodName} from '../Utils/General/GetMethodName';
import {Stats} from '../Utils/Stats/Stats';

export class AudioStats extends Writable {
	public readonly stats: Stats;
	public readonly statsParams: StatsParams;

	constructor(statsParams: StatsParams) {
		super();
		this.statsParams = statsParams;
		this.stats = new Stats(this.statsParams.bitDepth, this.statsParams.channels);
	}

	reset() {
		this.stats.reset();
	}

	public _write(chunk: Uint8Array, _: BufferEncoding, callback: (error?: Error) => void): void {
		const audioData = new ModifiedDataView(chunk.buffer, chunk.byteOffset, chunk.length);

		const bytesPerElement = this.statsParams.bitDepth / 8;

		const isLe = isLittleEndian(this.statsParams.endianness);

		const getSampleMethod: `get${IntType}${BitDepth}` = `get${getMethodName(this.statsParams.bitDepth, this.statsParams.unsigned)}`;

		for (let index = 0; index < audioData.byteLength; index += bytesPerElement) {
			const sample = audioData[getSampleMethod](index, isLe);
			this.stats.update(sample);
		}

		callback();
	}
}
