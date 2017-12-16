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
const moment = require('moment');

const errors = require('./errors.js');
const types = require('./types.js');
const utils = require('./utils.js');

class Request extends EventEmitter {
	constructor(sql, callback) {
		super();

		this.uuid = uuid.v4();
		this.sql = sql;
		this.callback = callback;
		this.state = 'ready';

		this.parameters = {};
		this.invalidParameters = utils.getSQLVariables(this.sql);

		debug(`creating request (${ this.uuid }): ${ this.sql.length > 80 ? this.sql.slice(0, 80) + '...' : this.sql }`);
	}

	execute(context) {
		debug(`connection (${ context.uuid }): executing request (${ this.uuid })`);
		if (this.state === 'running') {
			throw errors.createError('Request is already running', 'EINPROGRESS');
		}
		context.requests.push(this);

		try {
			let options = this._getParameterizedOptions();

			this.state = 'running';
			context.connection.queryResult(options, (err, result) => {
				if (err) {
					this.state = 'error';
					context.removeRequest(this, errors.formatDriverError(err));
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
							this.state = 'error';
							result.closeSync();
							context.removeRequest(this, errors.formatDriverError(err));
							return;
						}

						if (data === null) {
							if (rowDelta === 0) { rowDelta = result.getRowCountSync(); }
							if (rowDelta > 0) { rowCount += rowDelta; }

							if (result.moreResultsSync()) {
								loop.emit('set');
							} else {
								this.state = 'done';
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
								} else if (row[i].metadata.type.name === 'datetimeoffset') {
									row[i].value = new Date(row[i].value);
								} else if (['datetime', 'datetime2', 'smalldatetime'].indexOf(row[i].metadata.type.name) !== -1) {
									row[i].value = moment.utc(row[i].value).toDate();
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
			this.state = 'error';
			context.removeRequest(this);
			throw err;
		}
	}

	addParameter(key, type, value, options) {
		if (this.invalidParameters[key]) {
			throw errors.createError(`The variable name '@${ key }' has already been declared. Variable names must be unique within a query batch or stored procedure.`, 'EINVALID');
		}

		if (!key.match(/^[\w@$#]+$/)) {
			throw errors.createError(`Invalid parameter name '@${ key }'`, 'EINVALID');
		}

		let odbcType, defaultOptions;

		if (type && typeof type.name === 'string') {
			odbcType = types.ODBC[type.name.toLowerCase()];
			defaultOptions = types.DefaultOptions[type.name.toLowerCase()];
		}

		if (!odbcType) {
			throw errors.createError(`Invalid type for parameter '@${ key }'`, 'EINVALID');
		}

		this.parameters[key] = {
			type: odbcType,
			value: typeof value !== 'undefined' ? value : null,
			options: Object.assign({}, defaultOptions, options)
		};
	}

	_getParameterizedOptions() {
		let options = {
			sql: this.sql
		};

		let keys = this.parameters ? Object.keys(this.parameters) : [];
		let regexStr = '';

		for (let i = 0; i < keys.length; i++) {
			let key = keys[i].replace('$', '\\$');
			regexStr = `${ regexStr }\\s+@${ key }\\b${ i + 1 < keys.length ? '|' : '' }`;
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
