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

if ("undefined" === typeof(Sudoku)) {
	Sudoku = {};
}

$.extend(Sudoku, {
	rowToString: function(rowNum) {
		return "ABCDEFGHI".charAt(rowNum);
	},
	colToString: function(colNum) {
		return '' + (colNum + 1);
	},
	givenCharacters: "123456789",
	nonGivenCharacters: " .0",
	puzzles: [
      	{
      		name: "Please select..."
      	},
      	{
      		name: "Easy",
      		author: undefined,
      		date: undefined,
      		puzzleText: "\
.6.|7.3|.1.\
4..|9.1|..3\
...|.4.|...\
---+---+---\
58.|3.4|.21\
..6|.2.|5..\
14.|8.6|.79\
---+---+---\
...|.1.|...\
2..|5.7|..4\
.1.|6.8|.3.\
"
      	},
      	{
      		name: "Puzzle 76, The Times Su Doku Book 2 (fiendish)",
      		author: "W. Gould",
      		date: undefined,
      		puzzleText: "\
...|.5.|...\
..9|..6|8..\
.57|...|24.\
---+---+---\
.8.|9.4|...\
2..|.6.|..3\
...|3.8|.1.\
---+---+---\
.48|...|35.\
..1|4..|7..\
...|.9.|...\
"
      	},
      	{
      		name: "AI Escargot",
      		author: "Arto Inkala",
      		date: "2006",
      		puzzleText: "\
85.|..2|4..\
72.|...|..9\
..4|...|...\
---+---+---\
...|1.7|..2\
3.5|...|9..\
.4.|...|...\
---+---+---\
...|.8.|.7.\
.17|...|...\
...|.36|.4.\
"
      	},
      	{
      		name: "Arto Inkala's hardest",
      		author: "Arto Inkala",
      		date: "2010",
      		puzzleText: "\
..5|3..|...\
8..|...|.2.\
.7.|.1.|5..\
---+---+---\
4..|..5|3..\
.1.|.7.|..6\
..3|2..|.8.\
---+---+---\
.6.|5..|..9\
..4|...|.3.\
...|..9|7..\
"
      	}
    ]
});

$(function() {
	(function($) {
		testBitSet();
		var stringEdit = $('#numberString'),
			board = new Sudoku.Board($('.sudokuBoard')),
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
		$(Sudoku.puzzles).each(function(index, puzzle) {
			puzzleSelect.append(
				$('<option></option>').attr({label: puzzle.name}).text(puzzle.name).val(index)
			).on("change", function(event) {
				var selectedIndex = +$(this).val();
				if (!selectedIndex) {
					return; // Ignore first entry "Please select"
				}
				puzzle = Sudoku.puzzles[selectedIndex];
				puzzleInfo.text($.grep([ puzzle.author, puzzle.date ], function(val, index) {
					return !!val;
				}).join(", "));
				stringEdit.val(board.getNumberString(false));
				board.setNumberString(puzzle.puzzleText);
			});
		});
		// Enable tooltips on Cells
		$(document).tooltip({items: '.sudokuCell', track: false});
		// TODO: For debugging
		puzzleSelect.val(4).change();
		board.solve();
	})(jQuery);
});
