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
	/** Expected channel index of the next sample to be received */
	private currentChannel = 0;
	constructor(readonly params: ChannelsInputParams) {
		super();
	}

	public _write(chunk: Uint8Array, _: BufferEncoding, callback: (error?: Error) => void): void {
		const audioData = new ModifiedDataView(chunk.buffer, chunk.byteOffset, chunk.length);

		const bytesPerElement = this.params.bitDepth / 8;
		const isLe = isLittleEndian(this.params.endianness);
		const getSampleMethod: `get${IntType}${BitDepth}` = `get${getMethodName(this.params.bitDepth, this.params.unsigned)}`;

		for (let index = 0; index < audioData.byteLength; index += bytesPerElement) {
			const sample = audioData[getSampleMethod](index, isLe);
			this.onSample(this.currentChannel, sample);
			this.currentChannel = (this.currentChannel + 1) % this.params.channels.length;
		}

		callback();
	}

	abstract onSample(channel: number, sample: number): void;
}

/** Annex 1: https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf */
export class LoudnessStatsWritable extends AbstractWritable {
	// Stats:
	public momentaryLUFS = 0;
	public shortTermLUFS = 0;
	public integratedLUFS = 0;

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

		this.blockAccumulator3s = new BlockAccumulator(params.sampleRate, params.channels, 3000);
		this.blockAccumulator400ms = new BlockAccumulator(params.sampleRate, params.channels, 400);

		this.maxGatingBlocksBufferSize = integratedMeasurementIntervalMs / 400;
	}

	onSample(channel: number, x: number): void {
		// Normalise
		// ~TODO: account for signed
		x = 2 * ((x / (2 ** this.params.bitDepth)) - 0.5);
		const y = this.kFilters[channel].onSample(x);

		const block3s = this.blockAccumulator3s.addSample(channel, y);
		if (block3s) {
			this.shortTermLUFS = block3s.loudness;
		}

		const block400ms = this.blockAccumulator400ms.addSample(channel, y);
		if (block400ms) {
			this.momentaryLUFS = block400ms.loudness;

			this.gatingBlocks.push(block400ms);
			if (this.gatingBlocks.length > this.maxGatingBlocksBufferSize) {
				this.gatingBlocks.shift();
			}

			const absoluteThreshold = -70;
			const relativeThreshold = gatedLoudness(this.gatingBlocks, absoluteThreshold) - 10;
			this.integratedLUFS = gatedLoudness(this.gatingBlocks, Math.max(absoluteThreshold, relativeThreshold));
		}
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
 *  Momentary and Short-Term loudnesses are simply the loudness of a window of K-Filtered samples of duration 0.4 and 3s respectively.
 *  Integrated loudness accumulates 0.4s "blocks" and applies gating.
*/
class BlockAccumulator {
	/** Buffer[channelIdx][sampleIdx] */
	private buffer: number[][] = [];

	constructor(readonly sampleRate: SampleRate, readonly channelPositions: ChannelPosition[], readonly targetDurationMs = 400) {
		this.clearBuffer();
	}

	addSample(channel: number, sample: number): Block | undefined {
		this.buffer[channel].push(sample);
		// Upon adding the final channel our buffers should have the same length since samples for each channel are added in sequence
		const lastChannelIdx = this.channelPositions.length - 1;
		if (channel === lastChannelIdx) {
			const bufferDuration = this.buffer[lastChannelIdx].length / this.sampleRate;
			if (bufferDuration > this.targetDurationMs / 1000) {
				const block = new Block(this.buffer, this.channelPositions);
				this.clearBuffer();
				return block;
			}
		}

		return undefined;
	}

	private clearBuffer() {
		this.buffer = this.channelPositions.map(() => []);
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

