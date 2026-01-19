export class KFilter {
	// Shelving filter to account for acoustic effects of the head
	private readonly stage1 = new SecondOrderFilter({
		a1: -1.69065929318241,
		a2: 0.73248077421585,
		b0: 1.53512485958697,
		b1: -2.69169618940638,
		b2: 1.19839281085285,
	});

	// High pass filter
	private readonly stage2 = new SecondOrderFilter({
		a1: -1.99004745483398,
		a2: 0.99007225036621,
		b0: 1.0,
		b1: -2.0,
		b2: 1.0,
	});

	public onSample(sample: number): number {
		return this.stage2.onSample(this.stage1.onSample(sample));
	}
}

type SecondOrderFilterCoefficients = {
	a1: number;
	a2: number;
	b0: number;
	b1: number;
	b2: number;
};

class SecondOrderFilter {
	private z1 = 0;
	private z2 = 0;

	constructor(readonly coefficients: SecondOrderFilterCoefficients) { }

	public onSample(sample: number): number {
		const epsilon1 = sample - (this.coefficients.a1 * this.z1) - (this.coefficients.a2 * this.z2);
		const epsilon2 = (this.coefficients.b0 * epsilon1) + (this.coefficients.b1 * this.z1) + (this.coefficients.b2 * this.z2);
		this.z2 = this.z1;
		this.z1 = epsilon1;
		return epsilon2;
	}
}
