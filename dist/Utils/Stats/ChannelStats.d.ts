export declare class ChannelStats {
    private sumOfSquares;
    private count;
    private peakValue;
    private readonly maxRange;
    constructor(maxRange: number);
    update(sample: number): void;
    get rootMeanSquare(): number | undefined;
    get peak(): number | undefined;
    reset(): void;
}
