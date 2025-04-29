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

	for (let index = 0; index < audioData[0].byteLength; index += bytesPerElement) {
		const samples = audioData.map(data => data[getSampleMethod](index, isLe));

		for (let j = 0; j < samples.length; j++) {
			interleavedData[setSampleMethod]((index * samples.length) + (bytesPerElement * j), samples[j], isLe);
		}
	}

	return interleavedData;
}
