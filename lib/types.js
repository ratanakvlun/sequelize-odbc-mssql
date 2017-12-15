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

const TDS = {
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

// Type ids matched to Sequelize parsing system.
const Sequelize = {
	'bigint': { id: 0x7f },
	'binary': { id: 0xa5 },
	'bit': { id: 0x68 },
	'char': { id: 0xaf },
	'date': { id: 0x28 },
	'datetime': { id: 0x2a },
	'datetime2': { id: 0x2a },
	'datetimeoffset': { id: 0x2b },
	'decimal': { id: 0x6a },
	'float': { id: 0x6d },
	'udt': { id: 0xf0 },
	'image': { id: 0xa5 },
	'int': { id: 0x26 },
	'int identity': { id: 0x26 },
	'money': { id: 0x6a },
	'nchar': { id: 0xe7 },
	'ntext': { id: 0xe7 },
	'numeric': { id: 0x6a },
	'nvarchar': { id: 0xe7 },
	'real': { id: 0x6d },
	'smalldatetime': { id: 0x2a },
	'smallint': { id: 0x26 },
	'smallmoney': { id: 0x6a },
	'sql_variant': { id: 0x62 },
	'text': { id: 0xaf },
	'time': { id: 0x29 },
	'timestamp': { id: 0xad },
	'tinyint': { id: 0x26 },
	'uniqueidentifier': { id: 0x24 },
	'varbinary': { id: 0xa5 },
	'varchar': { id: 0xaf },
	'xml': { id: 0xf1 }
}

// ODBC type ids for parameter binding.
// Note: Sequelize only binds 'int', 'numeric', and 'nvarchar'.
const ODBC = {
	'bigint': { id: -5 },
	'binary': { id: -2 },
	'bit': { id: -7 },
	'char': { id: 1 },
	'date': { id: 91 },
	'datetime': { id: 93 },
	'datetime2': { id: 93 },
	'datetimeoffset': { id: 93 },
	'decimal': { id: 3 },
	'float': { id: 6 },
	'udt': { id: -3 },
	'image': { id: -4 },
	'int': { id: 4 },
	'int identity': { id: 4 },
	'money': { id: 3 },
	'nchar': { id: -8 },
	'ntext': { id: -10 },
	'numeric': { id: 2 },
	'nvarchar': { id: -9 },
	'real': { id: 7 },
	'smalldatetime': { id: 93 },
	'smallint': { id: 5 },
	'smallmoney': { id: 3 },
	'sql_variant': { id: -3 },
	'text': { id: -1 },
	'time': { id: 92 },
	'timestamp': { id: -2 },
	'tinyint': { id: -6 },
	'uniqueidentifier': { id: -11 },
	'varbinary': { id: -3 },
	'varchar': { id: 12 },
	'xml': { id: -9 }
};

// Default parameter binding options.
const DefaultOptions = {
	'datetime': { scale: 7 },
	'datetime2': { scale: 7 },
	'datetimeoffset': { scale: 7 },
	'decimal': { precision: 18, scale: 0 },
	'numeric': { precision: 18, scale: 0 },
	'time': { scale: 7 }
};

module.exports = {
	TDS: TDS,
	Sequelize: Sequelize,
	ODBC: ODBC,
	DefaultOptions: DefaultOptions
};
