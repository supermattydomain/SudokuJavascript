if ("undefined" === typeof(Sudoku)) {
	Sudoku = {};
}

$.extend(Sudoku, {
	/**
	 * Constructor for a Sudoku Board.
	 * @param table The HTML table to fill with a Sudoku Board.
	 */
	Board: function(table) {
		this.table = table;
		this.rows = [];
		this.cols = [];
		this.boxes = [];
		this.populate();
		this.addBorders();
	}
});

$.extend(Sudoku.Board.prototype, {
	populate: function() {
		var r, c, tbody, tableRow, tableCell;
		tbody = $('<tbody></tbody>');
		this.cells = [];
		for (r = 0; r < 9; r++) {
			tableRow = $('<tr></tr>');
			this.cells[r] = [];
			for (c = 0; c < 9; c++) {
				tableCell = $('<td></td>');
				this.cells[r][c] = new Sudoku.Cell(this, tableCell, r, c);
				tableRow.append(tableCell);
			}
			tbody.append(tableRow);
		}
		this.table.append(tbody);
		for (r = 0; r < this.table[0].rows.length; r++) {
			this.rows[r] = new Sudoku.House(this, r, r, 0, this.table[0].rows[r].cells.length - 1);
		}
		for (c = 0; c < this.table[0].rows[0].cells.length; c++) {
			this.cols[c] = new Sudoku.House(this, 0, this.table[0].rows.length - 1, c, c);
		}
		for (r = 0; r < 3; r++) {
			this.boxes[r] = [];
			for (c = 0; c < 3; c++) {
				this.boxes[r][c] = new Sudoku.House(this, r * 3, r * 3 + 2, c * 3, c * 3 + 2);
			}
		}
		return this;
	},
	cellAt: function(r, c) {
		return this.cells[r][c];
	},
	getRow: function(r) {
		return this.rows[r];
	},
	getColumn: function(c) {
		return this.cols[c];
	},
	getBox: function(r, c) {
		return this.boxes[r][c];
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
			if (!callback(this.getColumn(c))) {
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
		this.enumRows(function(row) {
			row.reset();
			return true;
		});
		this.enumColumns(function(col) {
			col.reset();
			return true;
		});
		this.enumBoxes(function(box) {
			box.reset();
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
							(new Sudoku.House(board, r, r, 0, house.colStart - 1)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
							// Portion of Row right of this Box
							(new Sudoku.House(board, r, r, house.colStart + 3, 8)).enumCells(function(cell) {
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
							(new Sudoku.House(board, 0, house.rowStart - 1, c, c)).enumCells(function(cell) {
								if (cell.setNumberImpossible(num)) {
									// console.log("solveLockedCandidates: " + cell + " cannot be a " + num);
									didWork = true;
								}
								return true;
							});
							// Portion of Col below this Box
							(new Sudoku.House(board, house.rowStart + 3, 8, c, c)).enumCells(function(cell) {
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
							(new Sudoku.House(
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
							(new Sudoku.House(
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
							(new Sudoku.House(
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
							(new Sudoku.House(
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
