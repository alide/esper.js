"use strict";

const Value = require('./Value');

class CompletionRecord {
	constructor(type, value, target) {
		if ( value === undefined ) {
			value = type;
			type = CompletionRecord.NORMAL;
		}

		this.type = type;
		this.value = value;
		this.target = target;
	}

	get abrupt() { return this.type !== CompletionRecord.NORMAL; }

	static makeTypeError(realm, msg) {
		return new CompletionRecord(CompletionRecord.THROW, realm.fromNative(new TypeError(msg), realm));
	}
}

CompletionRecord.NORMAL = 0;
CompletionRecord.BREAK = 1;
CompletionRecord.CONTINUE = 2;
CompletionRecord.RETURN = 3;
CompletionRecord.THROW = 4;

module.exports = CompletionRecord;