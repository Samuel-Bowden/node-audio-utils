import 'mocha';
import {ChannelPosition, type ChannelsInputParams, LoudnessStatsWritable} from './LoudnessStats';
import {expect} from 'chai';

function * generateWave(numSamples: number, sampleRate: number, frequency: number) {
	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const theta = 2 * Math.PI * frequency * t;
		const x = Math.sin(theta);
		yield x;
	}
}

function * repeatInner(generator: Generator<number>, n: number) {
	for (const x of generator) {
		for (let i = 0; i < n; i++) {
			yield x;
		}
	}
}

function writeSingleSampleChunk(stats: LoudnessStatsWritable, sample: number) {
	// Convert arbitrary int to a Uint8Array with 16 bit depth
	const buffer = new ArrayBuffer(2);
	const view = new DataView(buffer);
	view.setUint16(0, ((2 ** 16) - 1) * (sample + 1) / 2, true);
	stats._write(new Uint8Array(buffer), 'binary', () => undefined);
}

type WaveParams = {
	durationMs: number;
	numChannels?: number;
	frequency?: number;
	sampleRate?: number;
	dBFS?: number;
};
function sendWave(stats: LoudnessStatsWritable, params: WaveParams) {
	const sampleRate = params.sampleRate ?? 48_000;
	for (const x of repeatInner(generateWave(sampleRate * params.durationMs / 1000, sampleRate, params.frequency ?? 1_000), params.numChannels ?? 2)) {
		writeSingleSampleChunk(stats, x * dBFSToAmplitude(params.dBFS ?? 0));
	}
}

function dBFSToAmplitude(dBFS: number): number {
	return 10 ** (dBFS / 20);
}

function loudnessStatsParams(channels: ChannelPosition[]): ChannelsInputParams {
	return {
		sampleRate: 48000,
		channels,
		bitDepth: 16,
		endianness: 'LE',
		unsigned: true,
	};
}

describe('LoudnessStats', () => {
	it('Passes ITU-R 1770 997Hz 0dBFS tone test', () => {
		const loudnessStats = new LoudnessStatsWritable(
			loudnessStatsParams([ChannelPosition.Centre]),
			20_000,
		);
		sendWave(loudnessStats, {
			numChannels: 1,
			frequency: 997,
			durationMs: 20_000,
		});
		expect(loudnessStats.integratedLUFS).to.be.approximately(-3.01, 0.001);
	});

	it('Passes EBU Test case #1', () => {
		const loudnessStats = new LoudnessStatsWritable(
			loudnessStatsParams([ChannelPosition.Left, ChannelPosition.Right]),
			20_000,
		);
		sendWave(loudnessStats, {
			durationMs: 20_000,
			dBFS: -23.0,
		});
		expect(loudnessStats.momentaryLUFS).to.be.approximately(-23.0, 0.1);
		expect(loudnessStats.shortTermLUFS).to.be.approximately(-23.0, 0.1);
		expect(loudnessStats.integratedLUFS).to.be.approximately(-23.0, 0.1);
	}).timeout(4_000);

	it('Passes EBU Test case #2', () => {
		const loudnessStats = new LoudnessStatsWritable(
			loudnessStatsParams([ChannelPosition.Left, ChannelPosition.Right]),
			20_000,
		);
		sendWave(loudnessStats, {
			durationMs: 20_000,
			dBFS: -33.0,
		});
		expect(loudnessStats.momentaryLUFS).to.be.approximately(-33.0, 0.1);
		expect(loudnessStats.shortTermLUFS).to.be.approximately(-33.0, 0.1);
		expect(loudnessStats.integratedLUFS).to.be.approximately(-33.0, 0.1);
	}).timeout(4_000);

	it('Passes EBU Test case #3', () => {
		const loudnessStats = new LoudnessStatsWritable(
			loudnessStatsParams([ChannelPosition.Left, ChannelPosition.Right]),
			80_000,
		);
		sendWave(loudnessStats, {
			durationMs: 10_000,
			dBFS: -36.0,
		});
		sendWave(loudnessStats, {
			durationMs: 60_000,
			dBFS: -23.0,
		});
		sendWave(loudnessStats, {
			durationMs: 10_000,
			dBFS: -36.0,
		});
		expect(loudnessStats.integratedLUFS).to.be.approximately(-23.0, 0.1);
	}).timeout(16_000);
});
