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

class Request extends EventEmitter {
	constructor(sql, callback) {
		super();

		this.uuid = uuid.v4();
		this.sql = sql;
		this.callback = callback;

		debug(`creating request (${ this.uuid }): ${ this.sql.length > 80 ? this.sql.slice(0, 80) + '...' : this.sql }`);
	}

	execute(context) {
		debug(`connection (${ context.uuid }): executing request (${ this.uuid })`);
		context.requests.push(this);

		try {
			context.connection.queryResult(this.sql, (err, result) => {
				if (err) {
					context.removeRequest(this, err);
					return;
				}

				let loop = new EventEmitter();
				let metadata = null;
				let rowCount = 0;

				loop.on('set', () => {
					metadata = result.getColumnMetadataSync();
					loop.emit('next');
				});

				loop.on('next', () => {
					result.fetch((err, data) => {
						if (err) {
							result.closeSync();
							context.removeRequest(this, err);
							return;
						}

						if (data === null) {
							if (result.moreResultsSync()) {
								loop.emit('set');
							} else {
								result.closeSync();
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
											id: metadata[i].DATA_TYPE // TODO: convert to TDS types
										},
										size: metadata[i].BUFFER_LENGTH
									},
									value: data[i]
								};
							}
							rowCount++;
							this.emit('row', row);
						}

						loop.emit('next');
					});
				});

				loop.emit('set');
			});
		} catch (err) {
			context.removeRequest(this, err);
			context.close();
		}
	}
}

module.exports = Request;
