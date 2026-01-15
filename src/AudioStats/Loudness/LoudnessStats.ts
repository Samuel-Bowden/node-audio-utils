import {Writable} from 'stream';
import {ModifiedDataView} from '../../ModifiedDataView/ModifiedDataView';
import {isLittleEndian} from '../../Utils/General/IsLittleEndian';
import {Endianness, SampleRate, type BitDepth, type IntType} from '../../Types/AudioTypes';
import {getMethodName} from '../../Utils/General/GetMethodName';
import { KFilter } from './KFilter';

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

    abstract onSample(channel: number, sample: number): void
}

/** Annex 1: https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf */
export class LoudnessStatsWritable extends AbstractWritable {
    kFilters: KFilter[];
    blockAccumulator: BlockAccumulator;
    blocks: Block[] = [];
    maxBlocksBufferSize: number;
    LUFS = 0

    constructor(params: ChannelsInputParams, measurementIntervalMs: number) {
        super(params);
        this.kFilters = this.params.channels.map(() => new KFilter());
        this.blockAccumulator = new BlockAccumulator(params.sampleRate, params.channels)

        this.maxBlocksBufferSize = measurementIntervalMs / 400;
    }

    onSample(channel: number, x: number): void {
        const y = this.kFilters[channel].onSample(x);
        const newBlock = this.blockAccumulator.addSample(channel, y);
        if (newBlock) {
            this.blocks.push(newBlock);
            if (this.blocks.length > this.maxBlocksBufferSize) this.blocks.shift();
            const absoluteThreshold = -70
            const relativeThreshold = gatedLoudness(this.blocks, absoluteThreshold) - 10
            this.LUFS = gatedLoudness(this.blocks, Math.max(absoluteThreshold, relativeThreshold))
        }
    }
}

function gatedLoudness(blocks: Block[], threshold: number): number {
    const filteredBlocks = blocks.filter(block => block.loudness > threshold)
    const mean = filteredBlocks.reduce((acc, block) => acc + block.weightedMeanSquares, 0) / filteredBlocks.length
    return -0.691 + 10 * Math.log10(mean)
}

/** Accumulated 400ms of samples */
class Block {
    /** The weighted sum of the mean squares power for each channel */
    weightedMeanSquares: number;
    loudness: number;

    constructor(samples: number[][], channelPositions: ChannelPosition[]) {
        this.weightedMeanSquares = samples.reduce(
            (acc, channelSamples, i) => acc + WEIGHTING(channelPositions[i]) * this.calcChannelPower(channelSamples)
        , 0)
        this.loudness = -0.691 + 10 * Math.log10(this.weightedMeanSquares)
    }

    calcChannelPower(samples: number[]) {
        const sumOfSquares = samples.reduce((acc, sample) => acc + sample ** 2, 0);
        return sumOfSquares / samples.length;
    }
}

class BlockAccumulator {
    /** buffer[channelIdx][sampleIdx] */
    private buffer: number[][] = [];

    constructor(readonly sampleRate: SampleRate, readonly channelPositions: ChannelPosition[]) {
        this.buffer = channelPositions.map(() => []);
    }

    addSample(channel: number, sample: number): Block | undefined {
        this.buffer[channel].push(sample);
        // upon adding the final channel our buffers should have the same length since samples for each channel are added in sequence
        const lastChannelIdx = this.channelPositions.length - 1 
        if (channel === lastChannelIdx) {
            const bufferDuration = this.buffer[lastChannelIdx].length / this.sampleRate;
            if (bufferDuration > 0.4) {
                const block = new Block(this.buffer, this.channelPositions)
                this.buffer = [];
                return block;
            }
        }
        return undefined
    }
}

export enum ChannelPosition {
    Left,
    Right,
    Centre,
    LeftSurround,
    RightSurround,
    LFE,
    Other
}

type ChannelsInputParams = {
	sampleRate: SampleRate;
	channels: ChannelPosition[];
	bitDepth: BitDepth;
	endianness?: Endianness;
	unsigned?: boolean;
};

function WEIGHTING(channelPosition: ChannelPosition) {
    switch (channelPosition) {
        case ChannelPosition.Left | ChannelPosition.Right | ChannelPosition.Centre:
            return 1.0
        case ChannelPosition.LeftSurround | ChannelPosition.RightSurround:
            return 1.41
        default:
            throw new Error(`Channel position ${channelPosition} should never be used for weighting`)
    }
}

