if ("undefined" === typeof(Sudoku)) {
	Sudoku = {};
}

$.extend(Sudoku, {
	/**
	 * Constructor for a Sudoku 'House'.
	 * Each House is either a 9x1 row, a 1x9 column or a 3x3 box.
	 * Each House contains exactly 9 cells.
	 * Each House must contain exactly one of each of the digits 1 to 9 inclusive.
	 * Each Cell is a member of exactly three Houses: one row, one column and one box.
	 */
	House: function(board, rowStart, rowEnd, colStart, colEnd) {
		this.board = board;
		this.rowStart = rowStart;
		this.rowEnd = rowEnd;
		this.colStart = colStart;
		this.colEnd = colEnd;
		this.knownNumbers = new BitSet(9, 1);
		this.reset();
	}
});

$.extend(Sudoku.House.prototype, {
	reset: function() {
		this.knownNumbers.clearAll();
	},
	/**
	 * Enumerate the 9 Cells in this House in row first then column order.
	 * @return {Boolean} true iff enumeration completed, false iff terminated prematurely.
	 */
	enumCells: function(callback) {
		var r, c;
		for (r = this.rowStart; r <= this.rowEnd; r++) {
			for (c = this.colStart; c <= this.colEnd; c++) {
				if (!callback(this.board.cellAt(r, c))) {
					return false;
				}
			}
		}
		return true;
	},
	/**
	 * Return true if the position in this House
	 * of the given number was either Given or deduced,
	 * or false if it remains unknown.
	 * @param n the number to be found
	 * @returns {Boolean} whether the number was found
	 */
	isNumberKnown: function(num) {
		return this.knownNumbers.isSet(num);
	},
	/**
	 * Remember that the location of the given number in this House is now known.
	 * @param num The number whose location in this House is now known
	 * @returns this
	 */
	setNumberKnown: function(num) {
		this.knownNumbers.set(num);
		return this;
	},
	/**
	 * Enumerate numbers whose positions in this House are unknown,
	 * passing each to the given callback function.
	 * @param callback Function to be called with unknown number
	 * @returns true if enumeration completed, false if terminated prematurely
	 */
	enumUnknownNumbers: function(callback) {
		return this.knownNumbers.enumClear(callback);
	},
	/**
	 * Enumerate Cells in this House that could contain the given number,
	 * passing each to the given callback function.
	 * @param callback Function to be called with candidate Cell
	 * @returns true if enumeration completed, false if terminated prematurely
	 */
	enumPlacesForNumber: function(num, callback) {
		return this.enumCells(function(cell) {
			if (cell.isNumberPossible(num)) {
				if (!callback(cell)) {
					return false; // Terminate enumeration
				}
			}
			return true; // Next Cell
		});
	},
	/**
	 * Return an array of all Cells in this House that could contain the given number.
	 * @param num The number whose candidate Cells are to be returned
	 * @returns {Array} All Cells in this House that could contain the given number
	 */
	placesForNumber: function(num) {
		var places = [];
		this.enumPlacesForNumber(num, function(cell) {
			places.push(cell);
			return true; // Next Cell
		});
		return places;
	},
	getNumberString: function() {
		var ret = '';
		this.enumCells(function(cell) {
			ret += cell.getNumberString();
			return true;
		});
		return ret;
	},
	isRow: function() {
		return this.rowStart === this.rowEnd;
	},
	isColumn: function() {
		return this.colStart === this.colEnd;
	},
	isBox: function() {
		return (this.rowEnd === this.rowStart + 2) && (this.colEnd === this.colStart + 2);
	},
	toString: function() {
		if (this.isRow()) {
			return "Row(" + Sudoku.rowToString(this.rowStart) + ")";
		}
		if (this.isColumn()) {
			return "Col(" + Sudoku.colToString(this.colStart) + ")";
		}
		if (this.isBox()) {
			// return "Box(" + (Math.floor(this.rowStart / 3) + 1) + "," + (Math.floor(this.colStart / 3) + 1) + ")";
			return "Box("
				+ Sudoku.rowToString(this.rowStart)
				+ Sudoku.colToString(this.colStart)
				+ "-"
				+ Sudoku.rowToString(this.rowEnd)
				+ Sudoku.colToString(this.colEnd) +
				")";
		}
		return "House("
			+ Sudoku.rowToString(this.rowStart)
			+ "-"
			+ Sudoku.rowToString(this.rowEnd)
			+ ","
			+ Sudoku.colToString(this.colStart)
			+ "-"
			+ Sudoku.colToString(this.colEnd)
			+ ")";
	}
});
