/**
 * A bit vector. Only 32 bits can currently be stored.
 * TODO: multi-word backing store for bit vector.
 * TODO: Use words efficiently, but beware loss of precision,
 * as they are floats not ints in Javascript.
 * @param size Length in bits of vector.
 * @param base Index of first bit in vector.
 */
function BitSet(size, base) {
	if (size > 32) {
		throw "size of " + size + " too big";
	}
	this._size = size;
	this._base = base || 0;
	this.bits = 0;
	this.card = 0;
}
$.extend(BitSet.prototype, {
	_cardinality: function() {
		var bitNum, count = 0;
		for (bitNum = 0; bitNum < this._size; bitNum++) {
			if (this.bits & (1 << bitNum)) {
				count++;
			}
		}
		return count;
	},
	size: function() {
		return this._size;
	},
	base: function() {
		return this._base;
	},
	countSet: function() {
		return this.card;
	},
	/**
	 * Test whether the given-index bit is set.
	 * @param bitNum zero-based index of the bit to test
	 * @returns {Boolean} True if the given bit is set
	 */
	isSet: function(bitNum) {
		if (bitNum < this._base || bitNum >= this._base + this._size) {
			throw "Bit index " + bitNum + " is out of permitted range " + this._base + ".." + (this._base + this._size - 1);
		}
		bitNum -= this._base;
		return 0 !== (this.bits & (1 << bitNum));
	},
	isClear: function(bitNum) {
		return !this.isSet(bitNum);
	},
	/**
	 * Test whether any bit is set.
	 * @returns {Boolean} True if any bit is set, false if no bits set
	 */
	isAnySet: function() {
		return 0 !== this.bits;
	},
	isAnyClear: function() {
		return ((1 << this._size) - 1) !== this.bits;
	},
	/**
	 * Set one bit, identified by its zero-based index.
	 * @param bitNum the index of the bit to be set
	 */
	set: function(bitNum) {
		if (bitNum < this._base || bitNum >= this._base + this._size) {
			throw "Bit index " + bitNum + " is out of permitted range " + this._base + ".." + (this._base + this._size - 1);
		}
		if (this.isClear(bitNum)) {
			this.card++;
		}
		bitNum -= this._base;
		this.bits |= (1 << bitNum);
		return this;
	},
	/**
	 * Set all bits.
	 */
	setAll: function() {
		this.bits = (1 << this._size) - 1;
		this.card = this._size;
		return this;
	},
	/**
	 * Clear one bit, identified by its zero-based index.
	 * @param bitNum the index of the bit to be cleared
	 */
	clear: function(bitNum) {
		if (bitNum < this._base || bitNum >= this._base + this._size) {
			throw "Bit index " + bitNum + " is out of permitted range " + this._base + ".." + (this._base + this._size - 1);
		}
		if (this.isSet(bitNum)) {
			this.card--;
		}
		bitNum -= this._base;
		this.bits &= ~(1 << bitNum);
		return this;
	},
	/**
	 * Clear all bits.
	 */
	clearAll: function() {
		this.bits = 0;
		this.card = 0;
		return this;
	},
	setAllBut: function(bitNum) {
		if (bitNum < this._base || bitNum >= this._base + this._size) {
			throw "Bit index " + bitNum + " is out of permitted range " + this._base + ".." + (this._base + this._size - 1);
		}
		bitNum -= this._base;
		this.bits = (((1 << this._size) - 1) & ~(1 << bitNum));
		this.card = this._size - 1;
		return this;
	},
	/**
	 * Set one bit, identified by its zero-based index,
	 * and clear all other bits.
	 * @param bitNum the index of the sole bit to be set
	 */
	clearAllBut: function(bitNum) {
		if (bitNum < this._base || bitNum >= this._base + this._size) {
			throw "Bit index " + bitNum + " is out of permitted range " + this._base + ".." + (this._base + this._size - 1);
		}
		bitNum -= this._base;
		this.bits = (1 << bitNum);
		this.card = 1;
		return this;
	},
	and: function(bs) {
		if (this._size !== bs._size) {
			throw "Bitset sizes differ: " + this._size + " and " + bs._size;
		}
		if (this._base !== bs._base) {
			throw "Bitset bases differ: " + this._base + " and " + bs._base;
		}
		this.bits &= bs.bits;
		this.card = this._cardinality();
		return this;
	},
	or: function(bs) {
		if (this._size !== bs._size) {
			throw "Bitset sizes differ: " + this._size + " and " + bs._size;
		}
		if (this._base !== bs._base) {
			throw "Bitset bases differ: " + this._base + " and " + bs._base;
		}
		this.bits |= bs.bits;
		this.card = this._cardinality();
		return this;
	},
	xor: function(bs) {
		if (this._size !== bs._size) {
			throw "Bitset sizes differ: " + this._size + " and " + bs._size;
		}
		if (this._base !== bs._base) {
			throw "Bitset bases differ: " + this._base + " and " + bs._base;
		}
		this.bits ^= bs.bits;
		this.card = this._cardinality();
		return this;
	},
	not: function() {
		this.bits = ~this.bits;
		this.card = this._size - this.card;
		return this;
	},
	andNot: function(bs) {
		if (this._size !== bs._size) {
			throw "Bitset sizes differ: " + this._size + " and " + bs._size;
		}
		if (this._base !== bs._base) {
			throw "Bitset bases differ: " + this._base + " and " + bs._base;
		}
		this.bits &= ~bs.bits;
		this.card = this._cardinality();
		return this;
	},
	orNot: function(bs) {
		if (this._size !== bs._size) {
			throw "Bitset sizes differ: " + this._size + " and " + bs._size;
		}
		if (this._base !== bs._base) {
			throw "Bitset bases differ: " + this._base + " and " + bs._base;
		}
		this.bits |= ~bs.bits;
		this.card = this._cardinality();
		return this;
	},
	toString: function(base) {
		var ret = '', num;
		for (num = 0; num < this._size; num++) {
			if ((this.bits & (1 << num)) !== 0) {
				if (ret) {
					ret = ret + ', ';
				}
				ret += (num + this._base);
			}
		}
		return '{' + ret + '}';
	},
	toBinaryString: function() {
		var ret = '', num;
		for (num = 0; num < this._size; num++) {
			ret += ((this.bits & (1 << num)) ? '0' : '1');
		}
	}
});
