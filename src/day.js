"use strict"
module.exports = class Day 
{
	date

	recorder
	stapler
	compressor

	constructor(id, date, recorder, stapler, compressor)
	{
		this.date = date;
		this.recorder = recorder;
		this.stapler = stapler;
		this.compressor = compressor;
	}

}
