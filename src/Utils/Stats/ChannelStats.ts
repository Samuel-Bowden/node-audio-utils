export class ChannelStats {
	private sumOfSquares: number;
	private count: number;
	private peakValue: number;
	private readonly maxRange: number;

	constructor(maxRange: number) {
		this.sumOfSquares = 0;
		this.count = 0;
		this.peakValue = 0;
		this.maxRange = maxRange;
	}

	update(sample: number) {
		this.sumOfSquares += sample ** 2;
		this.count += 1;
		this.peakValue = Math.max(this.peakValue, Math.abs(sample));
	}

	get rootMeanSquare(): number | undefined {
		if (this.count === 0) {
			return undefined;
		}

		return Math.sqrt(this.sumOfSquares / this.count) / this.maxRange;
	}

	get peak(): number | undefined {
		if (this.count === 0) {
			return undefined;
		}

		return this.peakValue / this.maxRange;
	}

	reset() {
		this.sumOfSquares = 0;
		this.count = 0;
		this.peakValue = 0;
	}
}
