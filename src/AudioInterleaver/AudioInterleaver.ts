import {type InputParams, type OmitSomeParams, type InterleaverParams} from '../Types/ParamTypes';

import {Readable} from 'stream';

import {assertHighWaterMark} from '../Asserts/AssertHighWaterMark';

import {AudioInput} from '../AudioInput/AudioInput';
import {InterleaverUtils} from '../Utils/InterleaverUtils';

export class AudioInterleaver extends Readable {
	private readonly interleaverParams: InterleaverParams;
	private readonly audioUtils: InterleaverUtils;

	private readonly delayTimeValue;
	private isWork = false;

	private readonly inputs: AudioInput[] = [];

	constructor(params: InterleaverParams) {
		super();

		this.interleaverParams = params;
		this.audioUtils = new InterleaverUtils(params);

		if (params.delayTime && typeof params.delayTime === 'number') {
			this.delayTimeValue = params.delayTime;
		} else {
			this.delayTimeValue = 1;
		}
	}

	public get inputLength(): number {
		return this.inputs.length;
	}

	get params(): Readonly<InterleaverParams> {
		return this.interleaverParams;
	}

	set params(params: OmitSomeParams<InterleaverParams>) {
		Object.assign(this.interleaverParams, params);
	}

	_read(): void {
		assertHighWaterMark(this.params.bitDepth, this.params.highWaterMark);

		const allInputsSize: number[] = this.inputs.map((input: AudioInput) => input.dataSize)
			.filter(size => size >= (this.params.highWaterMark ?? (this.params.bitDepth / 8)));

		if (allInputsSize.length > 0) {
			const minDataSize: number = this.interleaverParams.highWaterMark ?? Math.min(...allInputsSize);

			const availableInputs = this.inputs.filter((input: AudioInput) => input.dataSize >= minDataSize);
			const dataCollection: Uint8Array[] = availableInputs.map((input: AudioInput) => input.getData(minDataSize));

			let interleavedData = this.audioUtils.setAudioData(dataCollection)
				.interleave()
				.getAudioData();

			if (this.interleaverParams.preProcessData) {
				interleavedData = this.interleaverParams.preProcessData(interleavedData);
			}

			this.unshift(interleavedData);

			return;
		}

		if (this.interleaverParams.generateSilence) {
			const silentSize = ((this.interleaverParams.sampleRate * this.interleaverParams.channels) / 1000) * (this.interleaverParams.silentDuration ?? this.delayTimeValue);
			const silentData = new Uint8Array(silentSize);

			this.unshift(silentData);
		}

		if (this.isWork) {
			if (this.inputs.length === 0 && this.interleaverParams.autoClose) {
				this.destroy();
			}
		}
	}

	_destroy(error: Error, callback: (error?: Error) => void): void {
		if (!this.closed) {
			this.inputs.forEach((input: AudioInput) => {
				input.destroy();
			});
		}

		callback(error);
	}

	public createAudioInput(inputParams: InputParams, index: number): AudioInput {
		const audioInput = new AudioInput(inputParams, this.interleaverParams, this.removeAudioinput.bind(this));

		if (index >= this.inputs.length) {
			this.inputs.push(audioInput);
		} else {
			this.inputs.splice(index, 0, audioInput);
		}

		this.isWork ||= true;

		this.emit('createInput');

		return audioInput;
	}

	public changeAudioInputIndex(audioInput: AudioInput, index: number) {
		const findAudioInput = this.inputs.indexOf(audioInput);

		if (findAudioInput !== -1) {
			const [temp] = this.inputs.splice(findAudioInput, 1);
			this.inputs.splice(index, 0, temp);
			return true;
		}

		return false;
	}

	public removeAudioinput(audioInput: AudioInput): boolean {
		const findAudioInput = this.inputs.indexOf(audioInput);

		if (findAudioInput !== -1) {
			this.inputs.splice(findAudioInput, 1);

			this.emit('removeInput');

			return true;
		}

		return false;
	}
}
