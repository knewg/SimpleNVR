"use strict"
module.exports = class Logger 
{

	logLevels = {
		"debug" : 0,
		"verbose" : 1,
		"notice" : 2,
		"warn" : 3,
		"error" : 4
	}

	padPrefix = 50
	system
	level
	constructor(system, logLevel)
	{
		this.system = system;
		logLevel = logLevel.toLowerCase();
		this.level = this.logLevels[logLevel];
		this.notice("Setting up logger for " + system + " at level " + logLevel);
	}

	debug(message)
	{
		if(this.level <= this.logLevels.debug)
		{
			this.consoleLog('DEBUG', message);
		}
	}

	verbose(message)
	{
		if(this.level <= this.logLevels.verbose)
		{
			this.consoleLog('VERBOSE', message);
		}
	}

	notice(message)
	{
		if(this.level <= this.logLevels.notice)
		{
			this.consoleLog('NOTICE', message);
		}
	}

	warn(message)
	{
		if(this.level <= this.logLevels.warning)
		{
			this.consoleLog('WARNING', message);
		}
	}

	error(message)
	{
		if(this.level <= this.logLevels.error)
		{
			this.consoleLog('ERROR', message);
			//TODO: Terminate progress?
		}
	}

	consoleLog(level, message)
	{
		var date = new Date();
		var YYYY = date.getFullYear();
		var MM = (date.getMonth() + 1).toString(10).padStart(2, '0');
		var DD = date.getDate().toString(10).padStart(2, '0');
		var HH = date.getHours().toString(10).padStart(2, '0');
		var ii = date.getMinutes().toString(10).padStart(2, '0');
		var ss = date.getSeconds().toString(10).padStart(2, '0');
		var ms = date.getMilliseconds().toString(10).padStart(3, '0');
		var dateString = YYYY + '-' + MM + '-' + DD + ' ' + HH + ':' + ii + ':' + ss + '+' + ms;

		var logPrefix = (dateString + ' - ' + this.system + ':' + level + ' - ').padEnd(this.padPrefix, ' ');
		console.log(logPrefix + message);
	}

}
