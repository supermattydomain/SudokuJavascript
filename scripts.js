/**
 * Sudoku game in Javascript.
 * Matthew 2012/11/23
 */

/**
 * IE8 does not support Object.keys(obj)
 * TODO: Polyfilla
 */
function objectCardinality(obj) {
	var size = 0, key = undefined; // Placate Eclipse
	for (key in obj) {
		if (obj.hasOwnProperty(key)) {
			size++;
		}
	}
	return size;
}

function rowToString(rowNum) {
	return "ABCDEFGHI".charAt(rowNum);
}
function colToString(colNum) {
	return '' + (colNum + 1);
}

var puzzles = [
	{
		name: "Please select..."
	},
	{
		name: "Easy",
		author: undefined,
		date: undefined,
		puzzleText: "\
.6.|7.3|.1. \
4..|9.1|..3 \
...|.4.|... \
---+---+--- \
58.|3.4|.21 \
..6|.2.|5.. \
14.|8.6|.79 \
---+---+--- \
...|.1.|... \
2..|5.7|..4 \
.1.|6.8|.3. \
"
	},
	{
		name: "Puzzle 76, The Times Su Doku Book 2 (fiendish)",
		author: "W. Gould",
		date: undefined,
		puzzleText: "\
...|.5.|... \
..9|..6|8.. \
.57|...|24. \
---+---+--- \
.8.|9.4|... \
2..|.6.|..3 \
...|3.8|.1. \
---+---+--- \
.48|...|35. \
..1|4..|7.. \
...|.9.|... \
"
	},
	{
		name: "AI Escargot",
		author: "Arto Inkala",
		date: "2006",
		puzzleText: "\
85.|..2|4.. \
72.|...|..9 \
..4|...|... \
---+---+--- \
...|1.7|..2 \
3.5|...|9.. \
.4.|...|... \
---+---+--- \
...|.8.|.7. \
.17|...|... \
...|.36|.4. \
"
	},
	{
		name: "Arto Inkala's hardest",
		author: "Arto Inkala",
		date: "2010",
		puzzleText: "\
..5|3..|... \
8..|...|.2. \
.7.|.1.|5.. \
---+---+--- \
4..|..5|3.. \
.1.|.7.|..6 \
..3|2..|.8. \
---+---+--- \
.6.|5..|..9 \
..4|...|.3. \
...|..9|7.. \
"
	}
];

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
function Cell(board, cell, row, col) {
	this.board = board;
	this.cell = cell;
	this.row = row;
	this.col = col;
	this.cell.addClass('sudokuCell');
	this.possibleNumbers = new BitSet(9, 1);
	this.reset();
}
$.extend(Cell.prototype, {
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
		var cell = this, ret,
			boxTop  = 3 * Math.floor(this.row / 3),
			boxLeft = 3 * Math.floor(this.col / 3);
		// Cells in the same Box other than the Cell itself
		ret = this.board.getBox(boxTop / 3, boxLeft / 3).enumCells(function(peer) {
			if (peer.row === cell.row && peer.col === cell.col) {
				return true; // Skip self
			}
			return callback(peer);
		});
		if (ret) {
			// Cells in the same column above the same Box
			ret = (new House(this.board, 0, boxTop - 1, this.col, this.col)).enumCells(callback);
		}
		if (ret) {
			// Cells in the same column below the same Box
			ret = (new House(this.board, boxTop + 3, 8, this.col, this.col)).enumCells(callback);
		}
		if (ret) {
			// Cells in the same row left of the same Box
			ret = (new House(this.board, this.row, this.row, 0, boxLeft - 1)).enumCells(callback);
		}
		if (ret) {
			// Cells in the same row right of the same Box
			ret = (new House(this.board, this.row, this.row, boxLeft + 3, 8)).enumCells(callback);
		}
		return ret;
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
		} else {
			this.cell.removeClass('given');
		}
		// Put possible numbers in title attribute,
		// for jQuery UI Tooltip to show them on hover
		this.cell.attr('title', '' + this.possibleNumbers);
		return this;
	},
	toString: function() {
		return "Cell(" + rowToString(this.row) + colToString(this.col) + ")";
	}
});

/**
 * Constructor for a Sudoku 'House'.
 * Each House is either a 9x1 row, a 1x9 column or a 3x3 box.
 * Each House contains exactly 9 cells.
 * Each House must contain exactly one of each of the digits 1 to 9 inclusive.
 * Each Cell is a member of exactly three Houses: one row, one column and one box.
 */
function House(board, rowStart, rowEnd, colStart, colEnd) {
	this.board = board;
	this.rowStart = rowStart;
	this.rowEnd = rowEnd;
	this.colStart = colStart;
	this.colEnd = colEnd;
}
$.extend(House.prototype, {
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
		return !this.enumCells(function(cell) {
			if (num === cell.solePossibleNumber()) {
				return false; // Halt enumeration
			}
			return true;
		});
	},
	enumUnknownNumbers: function(callback) {
		var num;
		for (num = 1; num <= 9; num++) {
			if (this.isNumberKnown(num)) {
				continue; // Skip known number
			}
			if (!callback(num)) {
				return false; // Halt enumeration
			}
		}
		return true;
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
	isCol: function() {
		return this.colStart === this.colEnd;
	},
	isBox: function() {
		return (this.rowEnd === this.rowStart + 2) && (this.colEnd === this.colStart + 2);
	},
	toString: function() {
		if (this.isRow()) {
			return "Row(" + rowToString(this.rowStart) + ")";
		}
		if (this.isCol()) {
			return "Col(" + colToString(this.colStart) + ")";
		}
		if (this.isBox()) {
			// return "Box(" + (Math.floor(this.rowStart / 3) + 1) + "," + (Math.floor(this.colStart / 3) + 1) + ")";
			return "Box(" + rowToString(this.rowStart) + colToString(this.colStart) + "-" +  rowToString(this.rowEnd) + "-" + colToString(this.colEnd) + ")";
		}
		return "House(" + rowToString(this.rowStart) + "-" + rowToString(this.rowEnd) + "," + colToString(this.colStart) + "-" + colToString(this.colEnd) + ")";
	}
});

function Board(table) {
	this.table = table;
	this.populate();
	this.addBorders();
}
$.extend(Board.prototype, {
	populate: function() {
		var r, c, tbody, tableRow, tableCell;
		tbody = $('<tbody></tbody>');
		this.cells = [];
		for (r = 0; r < 9; r++) {
			tableRow = $('<tr></tr>');
			this.cells[r] = [];
			for (c = 0; c < 9; c++) {
				tableCell = $('<td></td>');
				this.cells[r][c] = new Cell(this, tableCell, r, c);
				tableRow.append(tableCell);
			}
			tbody.append(tableRow);
		}
		this.table.append(tbody);
		return this;
	},
	cellAt: function(r, c) {
		return this.cells[r][c];
	},
	getRow: function(r) {
		return new House(this, r, r, 0, this.table[0].rows[r].cells.length - 1);
	},
	getCol: function(c) {
		return new House(this, 0, this.table[0].rows.length - 1, c, c);
	},
	getBox: function(r, c) {
		return new House(this, r * 3, r * 3 + 2, c * 3, c * 3 + 2);
	},
	enumRows: function(callback) {
		var r;
		for (r = 0; r < this.table[0].rows.length; r++) {
			if (!callback(this.getRow(r))) {
				return false; // Halt enumeration
			}
		}
		return true;
	},
	enumColumns: function(callback) {
		var c;
		for (c = 0; c < this.table[0].rows[0].cells.length; c++) {
			if (!callback(this.getCol(c))) {
				return false; // Halt enumeration
			}
		}
		return true;
	},
	enumBoxes: function(callback) {
		var r, c;
		for (r = 0; r < this.table[0].rows.length / 3; r++) {
			for (c = 0; c < this.table[0].rows[0].cells.length / 3; c++) {
				if (!callback(this.getBox(r, c))) {
					return false; // Halt enumeration
				}
			}
		}
		return true;
	},
	enumHouses: function(callback) {
		var ret;
		ret = this.enumRows(callback);
		if (ret) {
			ret = this.enumColumns(callback);
		}
		if (ret) {
			ret = this.enumBoxes(callback);
		}
		return ret;
	},
	enumCells: function(callback) {
		return this.enumRows(function(row) {
			return row.enumCells(callback);
		});
	},
	reset: function() {
		this.enumCells(function(cell) {
			cell.reset();
			return true;
		});
		return this;
	},
	getNumberString: function(formatted) {
		var str = '';
		this.enumRows(function(row) {
			str += row.getNumberString();
			if (formatted) {
				str += "\n";
			}
			return true;
		});
		return str;
	},
	setNumberString: function(str) {
		var i = 0, c;
		this.reset();
		this.enumCells(function(cell) {
			// Skip unrecognised characters
			do {
				c = str.charAt(i++);
			} while (".0123456789".indexOf(c) < 0);
			cell.setNumberString(c).updateView();
			return true;
		});
		return this;
	},
	/**
	 * Add additional CSS styles to cells that are at the edges of boxes or the board,
	 * or are given.
	 */
	addBorders: function() {
		var r, c;
		for (r = 0; r < this.table[0].rows.length; r++) {
			// Add boardExterior* style to left- and right-most cells of this row
			$(this.table[0].rows[r].cells[0]).addClass('boardExteriorLeft');
			$(this.table[0].rows[r].cells[this.table[0].rows[r].cells.length - 1]).addClass('boardExteriorRight');
			// Add boxExteriorLeft style to left-most cells of right-most two boxes
			$(this.table[0].rows[r].cells[3]).addClass('boxExteriorLeft');
			$(this.table[0].rows[r].cells[6]).addClass('boxExteriorLeft');
			// Add boxExteriorRight style to right-most cells of left-most two boxes
			$(this.table[0].rows[r].cells[2]).addClass('boxExteriorRight');
			$(this.table[0].rows[r].cells[5]).addClass('boxExteriorRight');
		}
		for (c = 0; c < this.table[0].rows[0].cells.length; c++) {
			// Add boardExterior* style to top- and bottom-most cells of this column
			$(this.table[0].rows[0].cells[c]).addClass('boardExteriorTop');
			$(this.table[0].rows[0].cells[this.table[0].rows.length]).addClass('boardExteriorBottom');
			// Add boxExteriorTop style to top-most cells of bottom-most two boxes
			$(this.table[0].rows[3].cells[c]).addClass('boxExteriorTop');
			$(this.table[0].rows[6].cells[c]).addClass('boxExteriorTop');
			// Add boxExteriorBottom style to bottom-most cells of top-most two boxes
			$(this.table[0].rows[2].cells[c]).addClass('boxExteriorBottom');
			$(this.table[0].rows[5].cells[c]).addClass('boxExteriorBottom');
		}
		return this;
	},
	/**
	 * The 'Single' is the simplest solution method.
	 * For each Cell, if that Cell can only contain one possible number,
	 * then as of now that Cell does contain that number.
	 * @returns {Boolean} Whether this method deduced any Cells' numbers.
	 */
	solveSingles: function() {
		var num, didWork = false;
		this.enumCells(function(cell) {
			if (cell.isGiven()) {
				return true; // Disregard Givens
			}
			if (cell.isDeduced()) {
				return true; // Disregard already-deduced Cells
			}
			num = cell.solePossibleNumber();
			if (num) {
				// console.log("solveSingles: " + cell + " must be a " + num);
				cell.setNumber(num);
				didWork = true;
			}
			return true;
		});
		return didWork;
	},
	/**
	 * The 'Hidden Single' is the second-simplest solution method.
	 * For each House, and for each number whose position in that House
	 * is not yet known, if there is only one Cell in that House that could
	 * contain that number, then as of now that Cell does contain that number.
	 * @returns {Boolean} Whether this method deduced any Cells' numbers.
	 */
	solveHiddenSingles: function() {
		var possibility, didWork = false;
		this.enumHouses(function(house) {
			house.enumUnknownNumbers(function(num) {
				possibility = undefined;
				house.enumCells(function(cell) {
					if (cell.isNumberPossible(num)) {
						if (possibility) {
							// Multiple possibilities for this number
							possibility = undefined;
							return false; // Halt enumeration
						}
						possibility = cell; // Found first possibility
					}
					return true; // Next Cell
				});
				if (possibility) {
					// console.log("solveHiddenSingles: " + possibility + " must be a " + num + ": only place in " + house);
					possibility.setNumber(num);
					didWork = true;
				}
				return true; // Next unknown number
			});
			return true; // Next House
		});
		return didWork;
	},
	/**
	 * 'Locked Candidates' is the third-simplest solution method.
	 * For each House, and for each number whose position in that House
	 * is not yet known, if the Cells in that house which could contain
	 * that number are all in the intersection of that House and some
	 * other House, then the remainder of that other House (other than
	 * its intersection with the first House) cannot contain that number.
	 * For example, if in some Box the location of the five is unknown,
	 * and if all Cells in that Box that could possibly contain a five
	 * lie within the intersection of that Box and some Column,
	 * then each of the Cells in the rest of that Column (other than
	 * its intersection with the Box) cannot contain a five.
	 * @returns {Boolean} Whether this method eliminated any possibilities.
	 */
	solveLockedCandidates: function() {
		var
			r = undefined, // Placate Eclipse
			c = undefined,
			b = undefined,
			rows, cols, boxes, didWork = false, board = this;
		this.enumHouses(function(house) {
			house.enumUnknownNumbers(function(num) {
				rows = {}, cols = {}, boxes = {};
				house.enumCells(function(cell) {
					if (cell.isNumberPossible(num)) {
						rows[cell.row] = true;
						cols[cell.col] = true;
						boxes[Math.floor(cell.row / 3) + '' + Math.floor(cell.col / 3)] = true;
					}
					return true; // Next Cell
				});
				if (1 === objectCardinality(rows)) {
					// All unknowns for this number are within the one Row within this House
					if (house.isRow()) {
						// We already know that all of a row's unknowns are contained in that one row
					} else if (house.isCol()) {
						// We have found a hidden single generated by previous elimination(s)
						for (r in rows) {
							if (board.cellAt(r, house.colStart).setNumber(num)) {
								didWork = true;
							}
						}
					} else if (house.isBox()) {
						// This House is a Box, and all of its candidates
						// for this number are in the same Row within this Box.
						// None of the Cells in that Row outside this Box
						// can contain that number.
						for (r in rows) {
							// Portion of Row left of this Box
							(new House(board, r, r, 0, house.colStart - 1)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
							// Portion of Row right of this Box
							(new House(board, r, r, house.colStart + 3, 8)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
						}
					} else {
						throw house + " is neither a Row, Col or Box";
					}
				}
				if (1 === objectCardinality(cols)) {
					// All unknowns for this number are within the one Col within this House
					if (house.isRow()) {
						// We have found a hidden single generated by previous elimination(s)
						for (c in cols) {
							if (board.cellAt(house.rowStart, c).setNumber(num)) {
								didWork = true;
							}
						}
					} else if (house.isCol()) {
						// We already know that all of a col's unknowns are contained in that one col
					} else if (house.isBox()) {
						// This House is a Box, and all of its candidates
						// for this number are in the same Col within this Box.
						// None of the Cells in that Col outside this Box
						// can contain that number.
						for (c in cols) {
							// Portion of Col above this Box
							(new House(board, 0, house.rowStart - 1, c, c)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
							// Portion of Col below this Box
							(new House(board, house.rowStart + 3, 8, c, c)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
						}
					} else {
						throw house + " is neither a Row, Col or Box";
					}
				}
				if (1 === objectCardinality(boxes)) {
					// All unknowns for this number are within the one Box within this House
					if (house.isRow()) {
						// This House is a Row, and all of its candidates
						// for this number are in the same Box within this Row.
						// None of the Cells in that Box outside this Row
						// can contain that number.
						for (b in boxes) {
							// Portion of Box above this Row
							(new House(
								board,
								+b.charAt(0) * 3,
								house.rowStart - 1,
								+b.charAt(1) * 3,
								+b.charAt(1) * 3 + 2
							)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
							// Portion of Box below this Row
							(new House(
								board,
								house.rowEnd + 1,
								+b.charAt(0) * 3 + 2,
								+b.charAt(1) * 3,
								+b.charAt(1) * 3 + 2
							)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
						}
					} else if (house.isCol()) {
						// This House is a Column, and all of its candidates
						// for this number are in the same Box within this Column.
						// None of the Cells in that Box outside this Column
						// can contain that number.
						for (b in boxes) {
							// Portion of Box left of this Col
							(new House(
								board,
								+b.charAt(0) * 3,
								+b.charAt(0) * 3 + 2,
								+b.charAt(1) * 3,
								house.colStart - 1
							)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
							// Portion of Box right of this Col
							(new House(
								board,
								+b.charAt(0) * 3,
								+b.charAt(0) * 3 + 2,
								house.colEnd + 1,
								+b.charAt(1) * 3 + 2
							)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
						}
					} else if (house.isBox()) {
						// We already know that all of a box's unknowns are contained in that one box
					} else {
						throw house + " is neither a Row, Col or Box";
					}
				}
				return true; // Next unknown number
			});
			return true; // Next House
		});
		return didWork;
	},
	/**
	 * Apply each solution method in order of computational expense,
	 * until none of them makes any progress, at which point either
	 * the puzzle is solved, or it is not solvable by this program.
	 * @returns this
	 */
	solve: function() {
		var i, methods = [ "Singles", "HiddenSingles", "LockedCandidates" ];
		nextPass: for (;;) {
			for (i = 0; i < methods.length; i++) {
				// console.log("Solving: " + methods[i]);
				if (this["solve" + methods[i]]()) {
					// This method made some progress
					continue nextPass; // Re-attempt all methods from start
				}
				// Method made no progress; try next method
			}
			// No methods made any progress
			break; // Either solved or unsolvable
		}
		return this;
	}
});

$(function() {
	(function($) {
		var stringEdit = $('#numberString'),
			board = new Board($('.sudokuBoard')),
			puzzleSelect = $('#puzzleSelect'),
			puzzleInfo = $('#puzzleInfo');
		// When the set-number-string button is clicked, update the board and game selector and info.
		$('#setNumberStringButton').on("click", function() {
			puzzleSelect.val(0);
			puzzleInfo.text('');
			board.setNumberString(stringEdit.val());
		});
		// When the solve button is clicked, solve the puzzle.
		$('#solveButton').on("click", function() {
			board.solve();
		});
		// When the reset button is clicked, reset the puzzle and update the number string and game selector and info.
		$('#resetButton').on("click", function() {
			puzzleSelect.val(0);
			puzzleInfo.text('');
			board.reset();
			stringEdit.val(board.getNumberString(false));
		});
		// Populate puzzle selector from included set of puzzles
		$(puzzles).each(function(index, puzzle) {
			puzzleSelect.append(
				$('<option></option>').attr({label: puzzle.name}).text(puzzle.name).val(index)
			).on("change", function(event) {
				var selectedIndex = +$(this).val();
				if (!selectedIndex) {
					return; // Ignore first entry "Please select"
				}
				puzzle = puzzles[selectedIndex];
				board.setNumberString(puzzle.puzzleText);
				puzzleInfo.text($.grep([ puzzle.author, puzzle.date ], function(val, index) {
					return !!val;
				}).join(", "));
				stringEdit.val(board.getNumberString(false));
			});
		});
		// Enable tooltips on Cells
		$(document).tooltip({items: '.sudokuCell', track: false});
		// TODO: For debugging
		puzzleSelect.val(4).change();
		board.solve();
	})(jQuery);
});
