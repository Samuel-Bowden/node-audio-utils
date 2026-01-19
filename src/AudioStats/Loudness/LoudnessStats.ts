import {Writable} from 'stream';
import {ModifiedDataView} from '../../ModifiedDataView/ModifiedDataView';
import {isLittleEndian} from '../../Utils/General/IsLittleEndian';
import {
	type Endianness, type SampleRate, type BitDepth, type IntType,
} from '../../Types/AudioTypes';
import {getMethodName} from '../../Utils/General/GetMethodName';
import {KFilter} from './KFilter';

/** Extracts samples from audio chunk according to bitDepth, endianness, etc. */
abstract class AbstractWritable extends Writable {
	constructor(readonly params: ChannelsInputParams) {
		super();
	}

	public _write(chunk: Uint8Array, _: BufferEncoding, callback: (error?: Error) => void): void {
		const audioData = new ModifiedDataView(chunk.buffer, chunk.byteOffset, chunk.length);

		const bytesPerElement = this.params.bitDepth / 8;
		const isLe = isLittleEndian(this.params.endianness);
		const getSampleMethod: `get${IntType}${BitDepth}` = `get${getMethodName(this.params.bitDepth, this.params.unsigned)}`;

		for (let index = 0; index < audioData.byteLength; index += bytesPerElement) {
			let sample = audioData[getSampleMethod](index, isLe);

			// Normalise to [-1,1]
			sample = 2 * ((sample / (2 ** this.params.bitDepth)) - 0.5);

			this.onSample(sample);
		}

		callback();
	}

	abstract onSample(sample: number): void;
}

/** Annex 1: https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf */
export class LoudnessStatsWritable extends AbstractWritable {
	// Stats:
	public M_LUFS = 0;
	public S_LUFS = 0;
	public I_LUFS = 0;

	public maxM_LUFS = -Infinity;
	public maxS_LUFS = -Infinity;

	/** Expected channel index of the next sample to be received */
	private currentChannel = 0;

	private readonly kFilters: KFilter[];

	// 400ms and 3s blocks are for momentary and short-term loudness respectively.
	// The 400ms blocks are also stored as "gating blocks" for the integrated loudness.
	private readonly blockAccumulator3s: BlockAccumulator;
	private readonly blockAccumulator400ms: BlockAccumulator;

	private readonly gatingBlocks: Block[] = [];
	private readonly maxGatingBlocksBufferSize: number;

	constructor(params: ChannelsInputParams, integratedMeasurementIntervalMs: number) {
		super(params);
		this.kFilters = this.params.channels.map(() => new KFilter());

		this.blockAccumulator3s = new BlockAccumulator(params.sampleRate, params.channels, 100, 3_000);
		this.blockAccumulator400ms = new BlockAccumulator(params.sampleRate, params.channels, 100, 400);

		this.maxGatingBlocksBufferSize = integratedMeasurementIntervalMs / 100; // New block produced every 100ms
	}

	onSample(x: number): void {
		const y = this.kFilters[this.currentChannel].onSample(x);

		const block3s = this.blockAccumulator3s.addSample(y);
		if (block3s) {
			this.S_LUFS = block3s.loudness;
			this.maxS_LUFS = Math.max(this.maxS_LUFS, this.S_LUFS);
		}

		const block400ms = this.blockAccumulator400ms.addSample(y);
		if (block400ms) {
			this.M_LUFS = block400ms.loudness;
			this.maxM_LUFS = Math.max(this.maxM_LUFS, this.M_LUFS);

			this.gatingBlocks.push(block400ms);
			if (this.gatingBlocks.length > this.maxGatingBlocksBufferSize) {
				this.gatingBlocks.shift();
			}

			const absoluteThreshold = -70;
			const relativeThreshold = gatedLoudness(this.gatingBlocks, absoluteThreshold) - 10;
			this.I_LUFS = gatedLoudness(this.gatingBlocks, Math.max(absoluteThreshold, relativeThreshold));
		}

		this.currentChannel = (this.currentChannel + 1) % this.params.channels.length;
	}
}

function gatedLoudness(blocks: Block[], threshold: number): number {
	const filteredBlocks = blocks.filter(block => block.loudness > threshold);
	const mean = filteredBlocks.reduce((acc, block) => acc + block.weightedMeanSquares, 0) / filteredBlocks.length;
	return -0.691 + (10 * Math.log10(mean));
}

class Block {
	/** The weighted sum of the mean squares power for each channel */
	public weightedMeanSquares: number;
	public loudness: number;

	constructor(samples: number[][], channelPositions: ChannelPosition[]) {
		this.weightedMeanSquares = samples.reduce(
			(acc, channelSamples, i) => acc + (weighting(channelPositions[i]) * this.calcChannelPower(channelSamples))
			, 0,
		);
		this.loudness = -0.691 + (10 * Math.log10(this.weightedMeanSquares));
	}

	calcChannelPower(samples: number[]) {
		const sumOfSquares = samples.reduce((acc, sample) => acc + (sample ** 2), 0);
		return sumOfSquares / samples.length;
	}
}

/** Accumulates a duration of samples.
 *  Blocks overlap by 75% of their duration
 *  Momentary and Short-Term loudnesses are simply the loudness of a window of K-Filtered samples of duration 0.4 and 3s respectively.
*/
class BlockAccumulator {
	/** Buffer[channelIdx][sampleIdx] */
	private readonly ringbuffer: number[][] = [];
	private ptr = 0;
	/** The number of samples (per channel) remaining to collect until we can emit a new block
	 *  Initially this is the size of the buffer, but subsequent blocks only collect 25% new samples.
	*/
	private samplesUntillFull: number;

	private readonly bufferSize: number;
	private readonly stepSize: number;
	private readonly numChannels: number;

	private currentChannel = 0;

	constructor(readonly sampleRate: SampleRate, readonly channelPositions: ChannelPosition[], stepMs: number, readonly targetDurationMs: number) {
		this.bufferSize = Math.ceil(sampleRate * targetDurationMs / 1000);
		this.stepSize = Math.ceil(sampleRate * stepMs / 1000);

		this.numChannels = channelPositions.length;

		this.ringbuffer = channelPositions.map(() => new Array<number>(this.bufferSize));
		this.samplesUntillFull = this.bufferSize;
	}

	addSample(sample: number): Block | undefined {
		this.ringbuffer[this.currentChannel][this.ptr] = sample;

		let block;

		// Upon adding the final channel we increment the pointer
		if (this.currentChannel === this.numChannels - 1) {
			this.samplesUntillFull -= 1;
			if (this.samplesUntillFull === 0) {
				block = new Block(this.ringbuffer, this.channelPositions);
				this.samplesUntillFull = this.stepSize;
			}

			this.ptr = (this.ptr + 1) % this.bufferSize;
		}

		this.currentChannel = (this.currentChannel + 1) % this.numChannels;

		return block;
	}
}

export enum ChannelPosition {
	Left,
	Right,
	Centre,
	LeftSurround,
	RightSurround,
	LFE,
	Other,
}

export type ChannelsInputParams = {
	sampleRate: SampleRate;
	channels: ChannelPosition[];
	bitDepth: BitDepth;
	endianness?: Endianness;
	unsigned?: boolean;
};

function weighting(channelPosition: ChannelPosition) {
	switch (channelPosition) {
		case ChannelPosition.Left:
		case ChannelPosition.Right:
		case ChannelPosition.Centre:
			return 1.0;
		case ChannelPosition.LeftSurround:
		case ChannelPosition.RightSurround:
			return 1.41;
		case ChannelPosition.LFE:
		case ChannelPosition.Other:
			throw new Error(`Channel position ${ChannelPosition[channelPosition]} should never be used for weighting`);
	}
}

