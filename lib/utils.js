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

const odbc = require('@ratanakvlun/node-odbc');

const errors = require('./errors.js');

const Drivers = [
	'SQL Server Native Client 13.0',
	'SQL Server Native Client 12.0',
	'SQL Server Native Client 11.0',
	'SQL Server Native Client 10.0',
	'SQL Native Client',
	'SQL Server'
];

function detectDriver(drivers) {
	if (!drivers) {
		drivers = Drivers;
	}

	let detectedDriver = null;

	return drivers.reduce((prev, driver) => {
		return prev.then(() => {
			if (detectedDriver !== null) {
				return;
			}

			return new Promise((resolve) => {
				odbc.open(`Driver=${ driver };`, (err, conn) => {
					if (err) {
						if (err.message.indexOf('Neither DSN nor SERVER keyword supplied') !== -1 && detectedDriver === null) {
							detectedDriver = driver;
						}
					} else {
						conn.closeSync();
					}
					resolve();
				});
			});
		});
	}, Promise.resolve()).then(() => {
		if (detectedDriver) {
			return detectedDriver;
		}

		throw errors.createError('A compatible ODBC driver was not found', 'ENOTFOUND');
	});
}

function getSQLVariables(sql) {
	if (!sql) {
		return {};
	}

	let variables = {};

	let match = sql.match(/declare\s+@[\w\d@$#_]+/gi);
	if (match) {
		match.map((str) => str.match(/@([\w\d@$#_]+)/)[1]).forEach((name) => { variables[name] = true; });
	}

	match = sql.match(/@[\w\d@$#_]+(\.(\[.+?\]|[\w\d@$#_]+))?\s*[*+-/%&^|]?=/gi);
	if (match) {
		match.map((str) => str.match(/@([\w\d@$#_]+)/)[1]).forEach((name) => { variables[name] = true; });
	}

	return variables;
}

module.exports = {
	detectDriver,
	getSQLVariables
};
