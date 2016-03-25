'use strict';
/* @flow */

const Value = require('../Value');
const LinkValue = require('./LinkValue');
const CompletionRecord = require('../CompletionRecord');
const ArrayValue = require('./ArrayValue');
/**
 * Represents a value that maps directly to an untrusted local value.
 */
class SmartLinkValue extends LinkValue {

	constructor(realm, value) {
		super(realm, value);
	}

	allowRead(name) {
		let props = this.apiProperties;
		if ( props === null ) return false;
		return props.indexOf(name) !== -1;
	}

	allowWrite(name) {
		var allowed = [];
		var native = this.native;
		if ( native.apiUserProperties ) {
			Array.prototype.push.apply(allowed, native.apiUserProperties);
		}

		return allowed.indexOf(name) != -1;
	}

	static make(native, realm) {
		if ( native === undefined ) return Value.undef;
		let prim = Value.fromPrimativeNative(native);
		if ( prim ) return prim;

		let wellKnown = realm.lookupWellKnown(native);
		if ( wellKnown ) return wellKnown;

		if ( Value.hasBookmark(native) ) {
			return Value.getBookmark(native);
		}

		if ( Array.isArray(native) ) {
			var ia = new Array(native.length);
			for ( let i = 0; i < native.length; ++i ) {
				ia[i] = SmartLinkValue.make(native[i], realm);
			}
			return ArrayValue.make(ia, realm);
		}

		return new SmartLinkValue(realm, native);
	}

	makeLink(native) {
		return SmartLinkValue.make(native, this.realm);
	}

	ref(name) {
		let realm = this.realm;
		let out = super.ref(name);
		if ( name in this.native ) {
			let noWrite = function *() { return yield CompletionRecord.makeTypeError(realm, "Can't write to protected property: " + name); };

			if ( !this.allowRead(name) ) {
				return {
					getValue: function *() { return yield CompletionRecord.makeTypeError(realm, "Can't read protected property: " + name); },
					setValue: noWrite,
					del: () => false
				};
			}

			if ( !this.allowWrite(name) ) {
				out.setValue = noWrite;
			}

		} else {
			//TODO: Mark value as having been written by user so they retain write permissions to it.
		}

		return out;
	}

	*put(name, value, s, extra) {

		if ( name in this.native ) {
			if ( !this.allowWrite(name) ) return yield CompletionRecord.makeTypeError(this.realm, "Can't write to protected property: " + name);
		} else {
			//TODO: Mark value as having been written by user so they retain write permissions to it.
		}

		return yield * super.put(name, value, s, extra);

	}

	*member(name) {

		if ( !(name in this.native) ) {
			return Value.undef;
		}

		if ( !this.allowRead(name) ) {
			return yield CompletionRecord.makeTypeError(this.realm, "Can't read protected property: " + name);
		}

		return yield * super.member(name);
	}

	get apiProperties() {
		let allowed = [];
		let native = this.native;

		if ( native.apiProperties === undefined && native.apiMethods === undefined ) return null;

		if ( native.apiProperties ) {
			Array.prototype.push.apply(allowed, native.apiProperties);
		}

		if ( native.apiUserProperties ) {
			Array.prototype.push.apply(allowed, native.apiUserProperties);
		}

		if ( native.apiMethods ) {
			Array.prototype.push.apply(allowed, native.apiMethods);
		}


		if ( native.apiOwnMethods ) {
			Array.prototype.push.apply(allowed, native.apiMethods);
		}


		if ( native.programmableProperties ) {
			Array.prototype.push.apply(allowed, native.programmableProperties);
		}

		return allowed;
	}

	get debugString() {
		return '[SmartLink: ' + this.native + ', props: ' + this.apiProperties.join(',') + ']';
	}

}

module.exports = SmartLinkValue;
