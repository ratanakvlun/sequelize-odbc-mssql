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

// TDS type mappings
module.exports = {
	'bigint': { id: 0x7f },
	'binary': { id: 0xad },
	'bit': { id: 0x32 },
	'char': { id: 0xaf },
	'date': { id: 0x28 },
	'datetime': { id: 0x3d },
	'datetime2': { id: 0x2a },
	'datetimeoffset': { id: 0x2b },
	'decimal': { id: 0x6a },
	'float': { id: 0x3e },
	'udt': { id: 0xf0 },
	'image': { id: 0x22 },
	'int': { id: 0x38 },
	'int identity': { id: 0x38 },
	'money': { id: 0x3c },
	'nchar': { id: 0xef },
	'ntext': { id: 0x63 },
	'numeric': { id: 0x6c },
	'nvarchar': { id: 0xe7 },
	'real': { id: 0x3b },
	'smalldatetime': { id: 0x3a },
	'smallint': { id: 0x34 },
	'smallmoney': { id: 0x7a },
	'sql_variant': { id: 0x62 },
	'text': { id: 0x23 },
	'time': { id: 0x29 },
	'timestamp': { id: 0xad },
	'tinyint': { id: 0x30 },
	'uniqueidentifier': { id: 0x24 },
	'varbinary': { id: 0xa5 },
	'varchar': { id: 0xa7 },
	'xml': { id: 0xf1 }
};
