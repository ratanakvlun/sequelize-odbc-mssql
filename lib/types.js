/*
ISC License

Copyright (c) 2017, Ratanak Lun <ratanakvlun@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

'use strict';

module.exports = {
	'tinyint': { id: 30 },
	'smallint': { id: 34 },
	'int': { id: 38 },
	'date': { id: 40 },
	'time': { id: 41 },
	'datetimeoffset': { id: 43 },
	'int identity': { id: 56 },
	'bit': { id: 104 },
	'decimal': { id: 106 },
	'float': { id: 109 },
	'real': { id: 109 },
	'varbinary': { id: 165 },
	'varchar': { id: 167 },
	'char': { id: 175 },
	'nvarchar': { id: 231 }
};
