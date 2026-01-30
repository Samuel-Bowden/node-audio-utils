import {type BitDepth} from '../../Types/AudioTypes';
import {getValueRange} from '../General/GetValueRange';
import {ChannelStats} from './ChannelStats';

export class Stats {
	public readonly channels: ChannelStats[];
	private currentChannel = 0;

	constructor(bitDepth: BitDepth, channelLength: number) {
		const maxRange = getValueRange(bitDepth).max;
		this.channels = Array.from(
			{length: channelLength},
			() => new ChannelStats(maxRange),
		);
	}

	public update(sample: number) {
		this.channels[this.currentChannel].update(sample);
		this.currentChannel += 1;
		this.currentChannel %= this.channels.length;
	}

	public reset() {
		this.channels.forEach(c => {
			c.reset();
		});
	}
}
