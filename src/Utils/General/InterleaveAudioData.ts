import {type IntType, type BitDepth} from '../../Types/AudioTypes';
import {type InputParams, type InterleaverParams} from '../../Types/ParamTypes';

import {ModifiedDataView} from '../../ModifiedDataView/ModifiedDataView';
import {isLittleEndian} from './IsLittleEndian';
import {getMethodName} from './GetMethodName';

export function interleaveAudioData(audioData: ModifiedDataView[], params: InputParams | InterleaverParams): ModifiedDataView {
	const bytesPerElement = params.bitDepth / 8;

	const isLe = isLittleEndian(params.endianness);

	const newData = new Uint8Array(audioData[0].byteLength * audioData.length);
	const interleavedData = new ModifiedDataView(newData.buffer);

	const getSampleMethod: `get${IntType}${BitDepth}` = `get${getMethodName(params.bitDepth, params.unsigned)}`;
	const setSampleMethod: `set${IntType}${BitDepth}` = `set${getMethodName(params.bitDepth, params.unsigned)}`;

	for (let index = 0; index < audioData[0].byteLength; index += bytesPerElement * params.channels) {
		for (let channel = 0; channel < params.channels; channel++) {
			for (let audioDataIndex = 0; audioDataIndex < audioData.length; audioDataIndex++) {
				const sampleValue = audioData[audioDataIndex][getSampleMethod](index + (bytesPerElement * channel), isLe);
				interleavedData[setSampleMethod]((index * audioData.length) + (bytesPerElement * (channel + (audioDataIndex * params.channels))), sampleValue, isLe);
			}
		}
	}

	return interleavedData;
}
