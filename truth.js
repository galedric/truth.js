#!/usr/bin/env node
//
//	Truth table generator
//
//	Copyright (C) 2011-2013 Bastien Clément
//	LaTeX generator by Frederic Jacobs, distributed with the same license.
//
//	Permission is hereby granted, free of charge, to any person obtaining
//	a copy of this software and associated documentation files (the
//	"Software"), to deal in the Software without restriction, including
//	without limitation the rights to use, copy, modify, merge, publish,
//	distribute, sublicense, and/or sell copies of the Software, and to
//	permit persons to whom the Software is furnished to do so, subject to
//	the following conditions:
//
//	The above copyright notice and this permission notice shall be included
//	in all copies or substantial portions of the Software.
//
//	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
//	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
//	IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
//	CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
//	TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//	SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

var expr_src;
if(!(expr_src = process.argv[2])) {
	console.log("No expression");
	console.log("Usage: ./truth.js \"logical expression\" > output.html");
	process.exit(0);
}

var Parser = require("jison").Parser;
var vm = require("vm");

// PARSE

var grammar = {
    "lex": {
        "rules": [
        	// Logical Operations
			["\\s+",			"/* skip whitespace */"],
			
			["&",				"return 'AND';"],
			["∧",				"return 'AND';"],
			["\\^",				"return 'AND';"],
			["and\\b",			"return 'AND';"],
			
			["\\+",				"return 'OR';"],
			["∨",				"return 'OR';"],
			["v",				"return 'OR';"],
			["or\\b",			"return 'OR';"],
			
			["#",				"return 'XOR';"],
			["⊕",				"return 'XOR';"],
			["xor\\b",			"return 'XOR';"],
			
			["->",				"return 'IMPL';"],
			["→",				"return 'IMPL';"],
			["impl",			"return 'IMPL';"],
			
			["<->",				"return 'IFF';"],
			["=",				"return 'IFF';"],
			["≡",				"return 'IFF';"],
			["↔",				"return 'IFF';"],
			["iff",				"return 'IFF';"],
			
			["-",				"return 'NOT';"],
			["~",				"return 'NOT';"],
			["¬",				"return 'NOT';"],
			["not\\b",			"return 'NOT';"],
			
			[",",				"return 'JOIN';"],
			
			// Variables
			["[a-zA-Z]+\\b",	"return 'SYMBOL';"],

			// Grouping
			["\\(",				"return '(';"],
			["\\)",				"return ')';"],
			["\\[",				"return '(';"],
			["\\]",				"return ')';"],
			["\\{",				"return '(';"],
			["\\}",				"return ')';"],

			// EOF
			["$",				"return 'EOF';"]
        ]
    },

    "operators": [
		["left", "JOIN"],
		["left", "IFF"],
		["left", "IMPL"],
		["left", "OR", "XOR"],
		["left", "AND"],
		["left", "NOT"]
    ],

    "bnf": {
        "expressions" :[[ "e EOF",	"return $1;" ]],

        "e" :[[ "( e )",		"$$ = $2;" ],
		      [ "e AND e",		"$$ = '_and('+$1+','+$3+')';" ],
		      [ "e OR e",		"$$ = '_or('+$1+','+$3+')';" ],
		      [ "e XOR e",		"$$ = '_xor('+$1+','+$3+')';" ],
		      [ "e IMPL e",		"$$ = '_impl('+$1+','+$3+')';" ],
		      [ "e IFF e",		"$$ = '_iff('+$1+','+$3+')';" ],
		      [ "NOT e",		"$$ = '_not('+$2+')';", {prec: "NOT"} ],
		      [ "e JOIN e",		"$$ = '_join('+$1+','+$3+')';" ],
		      [ "SYMBOL",		"$$ = '\"'+yytext+'\"';" ]]
    }
}

var parser = new Parser(grammar);
var expr = parser.parse(expr_src);

// OUTPUT GENERATORS

var generators = {
	html: {
		symbols: {
			"obr":  "(",
			"cbr":  ")",
			"and":  " ∧ ",
			"join": " , ",
			"or":   " ∨ ",
			"xor":  " ⊕ ",
			"impl": " → ",
			"iff":  " ≡ ",
			"notb":  "¬",
			"nota":  ""
		},

		begin: function(expr, prims, nprims) {
			process.stdout.write("<!DOCTYPE html>\n");
			process.stdout.write("<h1>Truth table for "+expr+"</h1>");

			process.stdout.write("<style>");
				process.stdout.write("*{margin:0; padding:0;}");
				process.stdout.write("body{font-family:\"Heveltica Neue\", sans-serif; padding:20px;}");
				process.stdout.write("h1{margin:10px 0px;font-weight:normal;}");
				process.stdout.write("table{text-align:center;border-collapse:collapse;}");
				process.stdout.write("tr:nth-child(odd){background:#eee}");
				process.stdout.write("td,th{padding:2px 5px;border:1px solid #ccc;}");
			process.stdout.write("</style>");

			process.stdout.write("<table>");

			process.stdout.write("<tr><th>"+ prims.concat([" "], nprims).join("</th><th>") +"</th></tr>");
		},

		line: function(prims, nprims) {
			process.stdout.write("<tr><td>"+ prims.concat([" "], nprims).join("</td><td>") +"</td></tr>");
		},

		end: function() {
			process.stdout.write("</table>");
		}
	},
	
	latex: {
		symbols: {
			"obr":  "(",
			"cbr":  ")",
			"and":  " \\wedge ",
			"join": " , ",
			"or":   " \\lor ",
			"xor":  " \\oplus ",
			"impl": " \\to ",
			"iff":  " \\leftrightarrow ",
			"notb":  " \\lnot ",
			"nota":  ""
		},

		begin: function(expr, prims, nprims) {
			process.stdout.write("Truth table for $"+last+"$ \\newline\n");
			process.stdout.write("\\newcolumntype{C}{>{\\begin{math}}c<{\\end{math}}}%\n");

			String.prototype.repeat = function( num )
			{
				return new Array( num + 1 ).join( this );
			}

			process.stdout.write("\\begin{tabular}" + "{" +"C".repeat(Math.pow(2, primitivesCount)+primitivesCount)+"}"+"\n");

			process.stdout.write(prims.concat([" "], nprims).join(" & ") +"\\\\\n");

			process.stdout.write("\\hline\n");
		},

		line: function(prims, nprims) {
			process.stdout.write(prims.concat([" "], nprims).join(" & ") +"\\\\\n");
		},

		end: function() {
			process.stdout.write("\\end{tabular}");
		}
	}
};

var gen = generators[process.argv[3]] || generators.html;

// EVALUATE

var ctx = {
	primitives: [],
	logicalElements: [],
};

var api = {
	LogicalElement: function(l, v, primitive, join, simple) {
		if(ctx.logicalElements[l]) return ctx.logicalElements[l];

		this.l = (primitive || simple) ? l : gen.symbols["obr"] + l + gen.symbols["cbr"];
		this.v = (primitive && ctx.primitives[l]) ? ctx.primitives[l] : v;
		this.p = !!primitive;
		this.j = !!join;

		ctx.logicalElements[l] = this;
	},

	toLogicalElement: function(e) {
		return (e instanceof api.LogicalElement) ? e : new api.LogicalElement(e, null, true);
	},

	_and: function(p, q, join) {
		p = api.toLogicalElement(p);
		q = api.toLogicalElement(q);

		return new api.LogicalElement(
			p.l + (join ? gen.symbols["join"] : gen.symbols["and"]) + q.l,
			p.v && q.v,
			false,
			join
		);
	},

	_join: function(p, q) {
		return api._and(p, q, true);
	},

	_or: function(p, q) {
		p = api.toLogicalElement(p);
		q = api.toLogicalElement(q);

		return new api.LogicalElement(
			p.l + gen.symbols["or"] + q.l,
			p.v || q.v
		);
	},

	_xor: function(p, q) {
		p = api.toLogicalElement(p);
		q = api.toLogicalElement(q);

		return new api.LogicalElement(
			p.l + gen.symbols["xor"] + q.l,
			(p.v || q.v) && !(p.v && q.v)
		);
	},

	_impl: function(p, q) {
		p = api.toLogicalElement(p);
		q = api.toLogicalElement(q);

		return new api.LogicalElement(
			p.l + gen.symbols["impl"] + q.l,
			!p.v || (p.v && q.v)
		);
	},

	_iff: function(p, q) {
		p = api.toLogicalElement(p);
		q = api.toLogicalElement(q);

		return new api.LogicalElement(
			p.l + gen.symbols["iff"] + q.l,
			!(p.v || q.v) || (p.v && q.v)
		);
	},

	_not: function(p) {
		p = api.toLogicalElement(p);

		return new api.LogicalElement(
			gen.symbols["notb"] + p.l + gen.symbols["nota"],
			!p.v,
			false,
			false,
			true
		);
	}
};

vm.runInNewContext(expr, api);

var nextMask = 1;
var primitivesCount = 0
var primitivesMask = [];

var masks = [];

var _p = [], _np = [], last;

for(var l in ctx.logicalElements) {
	var e = ctx.logicalElements[l];

	if(e.p) {
		primitivesMask[l] = masks.length;
		masks.push(nextMask);
		nextMask <<= 1;
		primitivesCount++;
	}

	last = l;

	if(!e.j)
		(e.p ? _p : _np).push(l);
}

masks = masks.reverse();

gen.begin(last, _p, _np);

for(var i = 0; i < Math.pow(2, primitivesCount); i++) {
	var primitives = [];
	for(var l in primitivesMask) {
		primitives[l] = Boolean(i & masks[primitivesMask[l]]);
	}

	ctx = {
		primitives: primitives,
		logicalElements: []
	};

	vm.runInNewContext(expr, api);

	_p = []; _np = [];

	for(var l in ctx.logicalElements) {
		var e = ctx.logicalElements[l];

		if(!e.j)
			(e.p ? _p : _np).push(e.v ? 1 : 0);
	}

	gen.line(_p, _np);
}

gen.end();
