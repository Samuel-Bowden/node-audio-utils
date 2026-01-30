import { Writable } from 'stream';
import { type StatsParams } from '../Types/ParamTypes';
import { Stats } from '../Utils/Stats/Stats';
export declare class AudioStats extends Writable {
    readonly stats: Stats;
    readonly statsParams: StatsParams;
    constructor(statsParams: StatsParams);
    reset(): void;
    _write(chunk: Uint8Array, _: BufferEncoding, callback: (error?: Error) => void): void;
}
