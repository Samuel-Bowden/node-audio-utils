import 'mocha';
import {expect} from 'chai';
import {KFilter} from './KFilter';

function * generateWave(numSamples: number, sampleRate: number, frequency: number, amplitude: number) {
	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;
		const theta = 2 * Math.PI * frequency * t;
		yield Math.sin(theta) * amplitude;
	}
}

function amplitudeToDB(amplitude: number): number {
	return 20 * Math.log10(amplitude);
}

function testFrequency(frequency: number, desiredRelativeDb: number) {
	const filter = new KFilter();
	// Initialize filter on 1s of wave
	for (const x of generateWave(48000, 48000, frequency, 1)) {
		filter.onSample(x);
	}

	// Then measure max amplitude over the next continued 1s
	let resultantAmplitude = 0;
	for (const x of generateWave(48000, 48000, frequency, 1)) {
		resultantAmplitude = Math.max(resultantAmplitude, Math.abs(filter.onSample(x)));
	}

	// The generated wave had amplitude 1, thus 0db, thus the db of the processed wave is also the change in db
	const relativeDb = amplitudeToDB(resultantAmplitude);
	const percentageError = Math.abs(desiredRelativeDb - relativeDb) / Math.abs(desiredRelativeDb);
	console.log(`frequency: ${frequency}\tdesiredDB: ${desiredRelativeDb}\tdB: ${relativeDb}\t%error: ${Math.round(percentageError * 100)}%`);
	expect(percentageError).to.be.lessThan(0.2);
}

describe('KFilter', () => {
	// Values from ITU-R 1770 FIGURE 2
	describe('response graph', () => {
		it('should attenuate low frequencies due to high pass stage', () => {
			testFrequency(10, -24);
			testFrequency(20, -14);
			testFrequency(50, -4);
			testFrequency(100, -1);
		});

		it('should boost high frequencies due to shelf filter', () => {
			testFrequency(1050, +1);
			testFrequency(100000, +4);
		});
	});
});
