/**
 * A bit vector. Only 32 bits can currently be stored.
 * TODO: multi-word backing store for bit vector.
 * TODO: Use words efficiently, but beware loss of precision,
 * as they are floats not ints in Javascript.
 * @param size Length in bits of vector.
 * @param base Index of first bit in vector.
 */
function BitSet(size, base) {
	if (size <= 0 || size > 32) {
		throw "size of " + size + " is out of permitted range 1..32";
	}
	this._size = size;
	this._base = base || 0;
	this.bits = 0;
	this.card = 0;
}
$.extend(BitSet.prototype, {
	_cardinality: function() {
		var count = 0;
		this.enumBits(function(index, val) {
			if (val) {
				count++;
			}
			return true;
		});
		return count;
	},
	_validateBitIndex: function(bitNum) {
		if (bitNum < this._base || bitNum >= this._base + this._size) {
			throw "Bit index " + bitNum + " is out of permitted range " + this._base + ".." + (this._base + this._size - 1);
		}
	},
	/**
	 * How many bits does this BitSet store?
	 * @returns The count of bits in this BitSet
	 */
	size: function() {
		return this._size;
	},
	/**
	 * What is the index of the first bit in this BitSet?
	 * @returns the index of the first bit in this BitSet
	 */
	base: function() {
		return this._base;
	},
	/**
	 * Is the givn BitSet equal to this BitSet?
	 * This tests equality, not identity.
	 * @param otherBitSet The BitSet to be compared to this BitSet
	 * @returns {Boolean} true if the BitSets are equal, false if they differ
	 */
	equals: function(otherBitSet) {
		return this._base === otherBitSet._base && this._count === otherBitSet._count && this.bits === otherBitSet.bits;
	},
	/**
	 * How many bits are set in this BitSet?
	 * @returns {Number} count of set bits in this BitSet
	 */
	countSet: function() {
		return this.card;
	},
	/**
	 * Test whether the given-index bit is set.
	 * @param bitNum zero-based index of the bit to test
	 * @returns {Boolean} True if the given bit is set
	 */
	isSet: function(bitNum) {
		this._validateBitIndex(bitNum);
		bitNum -= this._base;
		return 0 !== (this.bits & (1 << bitNum));
	},
	/**
	 * Test whether the given-index bit is clear.
	 * @param bitNum zero-based index of the bit to test
	 * @returns {Boolean} True if the given bit is clear
	 */
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
	/**
	 * Test whether any bit is clear.
	 * @returns {Boolean} True if any bit is clear, false if no bits clear
	 */
	isAnyClear: function() {
		return ((1 << this._size) - 1) !== this.bits;
	},
	/**
	 * Set one bit, identified by its zero-based index.
	 * @param bitNum the index of the bit to be set
	 */
	set: function(bitNum) {
		this._validateBitIndex(bitNum);
		if (this.isClear(bitNum)) {
			this.card++;
			bitNum -= this._base;
			this.bits |= (1 << bitNum);
		}
		return this;
	},
	/**
	 * Clear one bit, identified by its zero-based index.
	 * @param bitNum the index of the bit to be cleared
	 */
	clear: function(bitNum) {
		this._validateBitIndex(bitNum);
		if (this.isSet(bitNum)) {
			this.card--;
			bitNum -= this._base;
			this.bits &= ~(1 << bitNum);
		}
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
	 * Clear all bits.
	 */
	clearAll: function() {
		this.bits = this.card = 0;
		return this;
	},
	/**
	 * Set all bits except that with the given index.
	 * @param bitNum Index of bit to clear
	 */
	setAllBut: function(bitNum) {
		this._validateBitIndex(bitNum);
		bitNum -= this._base;
		this.bits = (((1 << this._size) - 1) & ~(1 << bitNum));
		this.card = this._size - 1;
		return this;
	},
	/**
	 * Clear all bits except that with the given index.
	 * @param bitNum Index of bit to clear
	 */
	clearAllBut: function(bitNum) {
		this._validateBitIndex(bitNum);
		bitNum -= this._base;
		this.bits = (1 << bitNum);
		this.card = 1;
		return this;
	},
	/**
	 * Binary AND this bitset with the given bitset.
	 * Only this bitset is modified.
	 * @param bs The bitset to be ANDed with this bitset.
	 */
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
	/**
	 * Binary OR this bitset with the given bitset.
	 * Only this bitset is modified.
	 * @param bs The bitset to be ORed with this bitset.
	 */
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
	/**
	 * Binary XOR this bitset with the given bitset.
	 * Only this bitset is modified.
	 * @param bs The bitset to be XORed with this bitset.
	 */
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
	/**
	 * Binary NOT this bitset, ie invert all its bits.
	 */
	not: function() {
		this.bits = ~this.bits;
		this.card = this._size - this.card;
		return this;
	},
	/**
	 * Binary AND this bitset with the inverse of the given bitset.
	 * Only this bitset is modified.
	 * @param bs The bitset whose inverse is to be ANDed with this bitset.
	 */
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
	/**
	 * Binary OR this bitset with the inverse of the given bitset.
	 * Only this bitset is modified.
	 * @param bs The bitset whose inverse is to be ORed with this bitset.
	 */
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
	/**
	 * Enumerate set bits in this bitset,
	 * calling the given callback for each set bit found.
	 * @param callback Function to be passed indices of set bits.
	 * @returns {Boolean} true if enumeration completed, false if terminated early
	 */
	enumSet: function(callback) {
		var num;
		for (num = this._base; num < this._base + this._size; num++) {
			if (this.isSet(num)) {
				if (!callback(num)) {
					return false;
				}
			}
		}
		return true;
	},
	/**
	 * Enumerate clear bits in this bitset,
	 * calling the given callback for each cleared bit found.
	 * @param callback Function to be passed indices of clear bits.
	 * @returns {Boolean} true if enumeration completed, false if terminated early
	 */
	enumClear: function(callback) {
		var num;
		for (num = this._base; num < this._base + this._size; num++) {
			if (this.isClear(num)) {
				if (!callback(num)) {
					return false;
				}
			}
		}
		return true;
	},
	/**
	 * Enumerate bits in this bitset, calling the given callback for each.
	 * @param callback Function to be passed (index, value) of each bit.
	 * @returns {Boolean} true if enumeration completed, false if terminated early
	 */
	enumBits: function(callback) {
		var num;
		for (num = this._base; num < this._base + this._size; num++) {
			if (!callback(num, this.isSet(num))) {
				return false;
			}
		}
		return true;
	},
	/**
	 * Generate a string listing numeric indices of set bits in this bitset.
	 * @returns {String} A string describing this bitset.
	 */
	toString: function() {
		var ret = '';
		this.enumSet(function(num) {
			if (ret) {
				ret += ', ';
			}
			ret += '' + num;
			return true;
		});
		return '{' + ret + '}';
	},
	/**
	 * Generate a string containing either a '0' for clear or '1' for set bits in this bitset.
	 * @returns {String} A string containing solely '0's and '1's.
	 */
	toBinaryString: function() {
		var ret = '';
		this.enumBits(function(num, val) {
			ret += '' + (val ? '1' : '0');
			return true;
		});
		return ret;
	}
});
