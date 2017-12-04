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

const EventEmitter = require('events').EventEmitter;

const debug = require('debug')('sequelize-odbc-request');
const uuid = require('uuid');

const errors = require('./errors.js');
const types = require('./types.js');

function getSQLVariables(sql) {
	let variables = {};

	if (!sql) { return null; }

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

class Request extends EventEmitter {
	constructor(sql, callback) {
		super();

		this.uuid = uuid.v4();
		this.sql = sql;
		this.callback = callback;

		this.parameters = null;
		this.invalidParameters = null;

		debug(`creating request (${ this.uuid }): ${ this.sql.length > 80 ? this.sql.slice(0, 80) + '...' : this.sql }`);
	}

	execute(context) {
		debug(`connection (${ context.uuid }): executing request (${ this.uuid })`);
		context.requests.push(this);

		try {
			let options = this._getParameterizedOptions();

			context.connection.queryResult(options, (err, result) => {
				if (err) {
					context.removeRequest(this, errors.formatError(err));
					return;
				}

				let loop = new EventEmitter();
				let metadata = null;
				let rowCount = 0;
				let rowDelta;

				loop.on('set', () => {
					rowDelta = 0;
					metadata = result.getColumnMetadataSync();
					loop.emit('next');
				});

				loop.on('next', () => {
					result.fetch((err, data) => {
						if (err) {
							result.closeSync();
							context.removeRequest(this, errors.formatError(err));
							return;
						}

						if (data === null) {
							if (rowDelta === 0) { rowDelta = result.getRowCountSync(); }
							if (rowDelta > 0) { rowCount += rowDelta; }

							if (result.moreResultsSync()) {
								loop.emit('set');
							} else {
								result.closeSync();
								context.removeRequest(this);

								if (typeof this.callback === 'function') {
									this.callback(null, rowCount);
								}
							}
							return;
						}

						if (data.length > 0) {
							let row = [];
							for (let i = 0; i < data.length; i++) {
								row[i] = {
									metadata: {
										colName: metadata[i].COLUMN_NAME,
										type: {
											id: types.Sequelize[metadata[i].TYPE_NAME] ? types.Sequelize[metadata[i].TYPE_NAME].id : null,
											name: metadata[i].TYPE_NAME
										},
										size: metadata[i].BUFFER_LENGTH
									},
									value: data[i]
								};

								if (row[i].value === null) { continue; }

								if (row[i].value instanceof Array && row[i].value[0] instanceof Buffer) {
									row[i].value = Buffer.concat(row[i].value);
								}

								if (row[i].value instanceof Buffer) {
									if (['char', 'varchar', 'text'].indexOf(row[i].metadata.type.name) !== -1) {
										row[i].value = row[i].value.toString('utf8');
									} else if (['nchar', 'nvarchar', 'ntext'].indexOf(row[i].metadata.type.name) !== -1) {
										row[i].value = row[i].value.toString('ucs2');
									}
								} else if (['datetime', 'datetime2', 'datetimeoffset', 'smalldatetime'].indexOf(row[i].metadata.type.name) !== -1) {
									row[i].value = new Date(row[i].value);
								}
							}

							rowDelta++;
							this.emit('row', row);
						}

						loop.emit('next');
					});
				});

				loop.emit('set');
			});
		} catch (err) {
			context.removeRequest(this, errors.formatError(err));
			context.close();
		}
	}

	addParameter(key, type, value, options) {
		if (this.invalidParameters === null) {
			this.invalidParameters = getSQLVariables(this.sql);
		}

		if (this.invalidParameters && this.invalidParameters[key]) {
			throw errors.formatError(`The variable name '@${ key }' has already been declared. Variable names must be unique within a query batch or stored procedure.`, 'EINVAL');
		}

		if (!key.match(/^[\w\d@$#_]+$/)) {
			throw errors.formatError(`Invalid parameter name '@${ key }'.`, 'EINVAL');
		}

		if (this.parameters === null) {
			this.parameters = {};
		}

		let odbcType, defaultOptions;

		if (type && typeof type.name === 'string') {
			odbcType = types.ODBC[type.name.toLowerCase()];
			defaultOptions = types.DefaultOptions[type.name.toLowerCase()];
		}

		if (!odbcType) {
			throw errors.formatError(`Invalid type.`, 'EINVAL');
		}

		this.parameters[key] = {
			type: odbcType,
			value: typeof value !== 'undefined' ? value : null,
			options: Object.assign({}, defaultOptions, options)
		};
	}

	_getParameterizedOptions() {
		let options = { sql: this.sql };
		let keys = this.parameters ? Object.keys(this.parameters) : [];
		let regexStr = '';

		for (let i = 0; i < keys.length; i++) {
			let key = keys[i].replace('$', '\\$');
			regexStr = `${ regexStr }\\s+@${ key }\\b${ i + 1 < keys.length ? '|' : ''}`;
		}

		if (regexStr.length > 0) {
			let regex = new RegExp(`(${ regexStr })`, 'gi');

			let paramOrder = this.sql.match(regex);
			if (paramOrder) {
				options.params = paramOrder.map((name) => this.parameters[name.slice(name.indexOf('@') + 1)]);
				options.sql = this.sql.replace(regex, ' ?');
			}
		}

		return options;
	}
}

module.exports = Request;
