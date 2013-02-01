function arrContains(arr, elt) {
	var i;
	for (i = 0; i < arr.length; i++) {
		if (arr[i] === elt) {
			return true;
		}
	}
	return false;
}

function assertBitSetEquals(bs, arr) {
	try {
		_assertBitSetEquals(bs, arr);
	} catch (err) {
		console.log(bs);
		console.log(arr);
		throw arguments.caller + ": " + err;
	}
}

function _assertBitSetEquals(bs, arr) {
	var arrStr;
	if (bs.countSet() !== arr.length) {
		throw "Cardinality is " + bs.countSet() + ", but array length is " + arr.length;
	}
	if (arr.length) {
		if (!bs.isAnySet()) {
			throw "No bits in set, but array has length";
		}
		if (bs.isAnyClear() && (arr.length == bs.size())) {
			throw "Some bits not in set, but array has length equal to bitset size";
		}
	} else {
		if (!bs.isAnyClear()) {
			throw "Bits in set, but array is empty";
		}
		if (bs.isAnySet()) {
			throw "Some bits in set, but array is empty";
		}
	}
	bs.enumSet(function(num) {
		if (bs.isClear(num)) {
			throw "Bit " + num + " enumerates set, but tests clear";
		}
		if (!arrContains(arr, num)) {
			throw "Bit " + num + " enumerates set, but is not in array";
		}
		return true;
	});
	bs.enumClear(function(num) {
		if (bs.isSet(num)) {
			throw "Bit " + num + " enumerates clear, but tests set";
		}
		if (arrContains(arr, num)) {
			throw "Bit " + num + " enumerates clear, but is in array";
		}
		return true;
	});
	bs.enumBits(function(num, val) {
		if (bs.isSet(num) !== val) {
			throw "Bit " + num + " isSet wrongly disagrees with val";
		}
		if (bs.isClear(num) === val) {
			throw "Bit " + num + " isClear wrongly agrees with val";
		}
		return true;
	});
	arrStr = '{' + arr.join(", ") + '}';
	if (bs.toString() !== arrStr) {
		throw "Bitset stringifies to '" + bs + "', but array stringifies to '" + arrStr + "'";
	}
}

function testBitSetOneSet() {
	var size = 13, base = 4, setIndex = Math.floor(base + (size / 2)), bs = new BitSet(size, base);
	bs.clearAll();
	bs.set(setIndex);
	assertBitSetEquals(bs, [ /* 4, 5, 6, 7, 8, 9, */ 10 /* , 11, 12, 13, 14, 15, 16, 17 */ ]);
}

function testBitSetOneClear() {
	var size = 11, base = 11, clearIndex = Math.floor(base + (size / 2)), bs = new BitSet(size, base);
	bs.setAll();
	bs.clear(clearIndex);
	assertBitSetEquals(bs, [ 11, 12, 13, 14, 15, 16, 17, 18, 19, /* 20, */ 21, 22 ]);
}

function testBitSetAllSetButOne() {
	var size = 6, base = 1, clearIndex = 4, bs = new BitSet(size, base);
	bs.setAllBut(clearIndex);
	assertBitSetEquals(bs, [ 1, 2, 3, /* 4, */ 5, 6 ]);
}

function testBitSetAllClearButOne() {
	var size = 26, base = 3, setIndex = 17, bs = new BitSet(size, base);
	bs.clearAllBut(setIndex);
	assertBitSetEquals(bs, [ /* 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, */ 17 /* , 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28 */ ]);
}

function testBitSetAnd() {
	var bs1 = new BitSet(13, 5), bs2 = new BitSet(13, 5);
	bs1.set(5);
	bs1.set(6);
	bs1.set(7);
	bs1.set(12);
	bs1.set(15);
	bs1.set(17);
	assertBitSetEquals(bs1, [ 5, 6, 7 /* , 8, 9, 10, 11 */, 12 /* , 13, 14 */, 15 /* , 16 */, 17 ]);
	bs2.set(5);
	bs2.set(7);
	bs2.set(8);
	bs2.set(10);
	bs2.set(11);
	bs2.set(12);
	bs2.set(14);
	bs2.set(16);
	bs2.set(17);
	assertBitSetEquals(bs2, [ 5 /* , 6 */, 7, 8 /* , 9 */, 10, 11, 12 /* , 13 */, 14 /*, 15 */, 16, 17 ]);
	bs1.and(bs2);
	assertBitSetEquals(bs1, [ 5 /* , 6 */, 7 /* , 8, 9, 10, 11 */, 12 /* , 13, 14, 15, 16 */, 17 ]);
	assertBitSetEquals(bs2, [ 5 /* , 6 */, 7, 8 /* , 9 */, 10, 11, 12 /* , 13 */, 14 /*, 15 */, 16, 17 ]);
}

function testBitSetOr() {
	var bs1 = new BitSet(13, 5), bs2 = new BitSet(13, 5);
	bs1.set(5);
	bs1.set(6);
	bs1.set(7);
	bs1.set(12);
	bs1.set(15);
	bs1.set(17);
	assertBitSetEquals(bs1, [ 5, 6, 7 /* , 8, 9, 10, 11 */, 12 /* , 13, 14 */, 15 /* , 16 */, 17 ]);
	bs2.set(5);
	bs2.set(7);
	bs2.set(8);
	bs2.set(10);
	bs2.set(11);
	bs2.set(12);
	bs2.set(14);
	bs2.set(16);
	bs2.set(17);
	assertBitSetEquals(bs2, [ 5 /* , 6 */, 7, 8 /* , 9 */, 10, 11, 12 /* , 13 */, 14 /*, 15 */, 16, 17 ]);
	bs1.or(bs2);
	assertBitSetEquals(bs1, [ 5, 6, 7, 8 /* , 9 */, 10, 11, 12 /* , 13 */, 14, 15, 16, 17 ]);
	assertBitSetEquals(bs2, [ 5 /* , 6 */, 7, 8 /* , 9 */, 10, 11, 12 /* , 13 */, 14 /*, 15 */, 16, 17 ]);
}

function testBitSet() {
	testBitSetOneSet();
	testBitSetAllSetButOne();
	testBitSetAllClearButOne();
	testBitSetAnd();
	testBitSetOr();
}
