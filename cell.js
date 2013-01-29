if ("undefined" === typeof(Sudoku)) {
	Sudoku = {};
}
$.extend(Sudoku, {
	/**
	 * Constructor for a Sudoku 'Cell'.
	 * Each Cell contains exactly one of the numbers 1 to 9 inclusive.
	 * Its contained number may be revealed at the start of the game,
	 * in which case it is called a 'Given'.
	 * Alternatively, the contained number may be initially hidden, in which case
	 * the aim of the game of Sudoku is to establish the number's value.
	 * Each Cell has exactly 20 distinct Peer Cells, each of which shares either
	 * a row, a column or a box with that Cell.
	 */
	Cell: function(board, cell, row, col) {
		this.board = board;
		this.cell = cell;
		this.row = row;
		this.col = col;
		this.cell.addClass('sudokuCell');
		this.possibleNumbers = new BitSet(9, 1);
		this.reset();
	}
});

$.extend(Sudoku.Cell.prototype, {
	reset: function() {
		this.given = false;
		this.deduced = false;
		this.possibleNumbers.setAll();
		this.cell.text('');
		this.updateView();
		return this;
	},
	/**
	 * Enumerate the 20 distinct Peers of this Cell.
	 */
	enumPeers: function(callback) {
		var cell = this, ret, box = this.getBox();
		// Cells in the same Box other than the Cell itself
		ret = box.enumCells(function(peer) {
			if (peer.row === cell.row && peer.col === cell.col) {
				return true; // Skip self
			}
			return callback(peer);
		});
		if (ret) {
			// Cells in the same column above the same Box
			ret = (new Sudoku.House(
				this.board,
				0,
				box.rowStart - 1,
				this.col,
				this.col)
			).enumCells(callback);
		}
		if (ret) {
			// Cells in the same column below the same Box
			ret = (new Sudoku.House(
				this.board,
				box.rowEnd + 1,
				8,
				this.col,
				this.col)
			).enumCells(callback);
		}
		if (ret) {
			// Cells in the same row left of the same Box
			ret = (new Sudoku.House(
				this.board,
				this.row,
				this.row,
				0,
				box.colStart - 1)
			).enumCells(callback);
		}
		if (ret) {
			// Cells in the same row right of the same Box
			ret = (new Sudoku.House(
				this.board,
				this.row,
				this.row,
				box.colEnd + 1,
				8)
			).enumCells(callback);
		}
		return ret;
	},
	/**
	 * Return the Row that contains this Cell.
	 */
	getRow: function() {
		return this.board.getRow(this.row);
	},
	/**
	 * Return the Column that contains this Cell.
	 */
	getColumn: function() {
		return this.board.getColumn(this.col);
	},
	/**
	 * Return the Box that contains this Cell.
	 */
	getBox: function() {
		return this.board.getBox(Math.floor(this.row / 3), Math.floor(this.col / 3));
	},
	/**
	 * Enumerate the three Houses that contain this Cell.
	 */
	enumHouses: function(callback) {
		if (!callback(this.getRow())) {
			return;
		}
		if (!callback(this.getColumn())) {
			return;
		}
		callback(this.getBox());
	},
	/**
	 * Return true if this Cell could contain the given number,
	 * or false if it could not contain that number.
	 * @returns {Boolean} Whether this Cell could contain the given number.
	 */
	isNumberPossible: function(num) {
		return this.possibleNumbers.isSet(num);
	},
	/**
	 * Set all numbers possible.
	 */
	setAllPossible: function() {
		if (this.given || this.deduced) {
			throw "Given or deduced " + this + " cannot have all possible numbers";
		}
		this.possibleNumbers.setAll();
		this.cell.text('');
		this.updateView();
		return this;
	},
	/**
	 * Remember that this Cell could contain the given number.
	 * @param num The number that this cell could contain.
	 */
	setNumberPossible: function(num) {
		if (this.isNumberPossible(num)) {
			return false; // Already possible
		}
		if (this.given || this.deduced) {
			throw "Given or deduced " + this + " cannot have possibility " + num + " added";
		}
		this.possibleNumbers.set(num);
		this.cell.text(''); // Could have been the second possibility
		this.updateView();
		return this;
	},
	/**
	 * Remember that this Cell could not contain the given number.
	 * @param num The number that this cell could not contain.
	 */
	setNumberImpossible: function(num) {
		if (!this.isNumberPossible(num)) {
			return false; // Already impossible
		}
		if (this.given || this.deduced) {
			throw "Given or deduced " + this + " cannot have possibility " + num + " removed";
		}
		this.possibleNumbers.clear(num);
		this.updateView();
		return true;
	},
	/**
	 * Set the contents of this Cell to the given number.
	 * This means that no Peer Cell of this Cell could
	 * contain the same number.
	 * This is the only constraint propagation performed on state change;
	 * the remainder is performed iteratively in Board.solve() and callees.
	 */
	setNumber: function(num) {
		if (!this.isNumberPossible(num)) {
			throw this + " cannot have number changed to " + num + "; possibilities are " + this.possibleNumbers;
		}
		if (this.deduced) {
			return false; // Already deduced
		}
		if (!this.given) {
			// If not given, must just have been deduced
			this.deduced = true;
		}
		this.possibleNumbers.clearAllBut(num);
		this.cell.text(num);
		this.updateView();
		this.enumPeers(function(peer) {
			peer.setNumberImpossible(num);
			return true;
		});
		this.enumHouses(function(house) {
			house.setNumberKnown(num);
			return true;
		});
		return true;
	},
	setNumberString: function(str) {
		if (".0".indexOf(str) >= 0) {
			// An initially-unknown Cell (ie, not a Given)
			this.given = false;
			this.updateView();
		} else if ("123456789".indexOf(str) >= 0) {
			// A Given
			this.given = true;
			this.setNumber(str.charCodeAt(0) - "0".charCodeAt(0));
		} else {
			throw "Unrecognised character '" + str + "'";
		}
		return this;
	},
	/**
	 * Return a string representing the initial contents of this Cell.
	 * If the Cell is a Given, return the number in this Cell.
	 * Otherwise, if the Cell is not a Given, return a dot (period).
	 */
	getNumberString: function() {
		if (this.given) {
			return this.solePossibleNumber();
		}
		return ".";
	},
	/**
	 * If there is a sole remaining possible number for this Cell,
	 * return that number.
	 * Otherwise, if multiple possibilities remain, return undefined.
	 */
	solePossibleNumber: function() {
		var num, possibility = undefined;
		// FIXME: Inefficient. A digit string would be better.
		for (num = this.possibleNumbers.base(); num < this.possibleNumbers.base() + this.possibleNumbers.size(); num++) {
			if (this.isNumberPossible(num)) {
				if (possibility) {
					return undefined; // Multiple possibilities
				}
				possibility = num;
			}
		}
		if (!possibility) {
			throw "No possible number for " + this;
		}
		return possibility;
	},
	/**
	 * Return true if this Cell is a Given,
	 * or false if it is not a Given.
	 */
	isGiven: function() {
		return this.given;
	},
	/**
	 * Return true if this Cell's number has been deduced,
	 * or false if it has not yet been deduced.
	 */
	isDeduced: function() {
		return this.deduced;
	},
	/**
	 * Return a truthy value if this Cell's number is currently known
	 * (by any means), or a falsy value if it is currently unknown.
	 */
	isKnown: function() {
		return this.given || this.deduced || (this.solePossibleNumber() !== undefined);
	},
	updateView: function() {
		if (this.given) {
			this.cell.addClass('given');
			this.cell.removeAttr('title');
		} else {
			this.cell.removeClass('given');
			if (this.possibleNumbers.countSet() > 1) {
				// Put possible numbers in title attribute,
				// for jQuery UI Tooltip to show them on hover
				this.cell.attr('title', '' + this.possibleNumbers);
			} else {
				this.cell.removeAttr('title');
			}
		}
		return this;
	},
	toString: function() {
		return "Cell(" + Sudoku.rowToString(this.row) + Sudoku.colToString(this.col) + ")";
	}
});
