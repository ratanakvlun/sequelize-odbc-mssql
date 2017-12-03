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

const debug = require('debug')('sequelize-odbc-connection');
const uuid = require('uuid');
const odbc = require('odbc');

const errors = require('./errors.js');
const constants = require('./constants.js');

const Request = require('./request.js');

function detectDriver() {
	const drivers = [
		'SQL Server Native Client 13.0',
		'SQL Server Native Client 12.0',
		'SQL Server Native Client 11.0',
		'SQL Server Native Client 10.0',
		'SQL Native Client',
		'SQL Server'
	];

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
						// Should not be possible because nothing but driver is specified.
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

		throw new Error('driver was not specified and no driver was detected');
	});
}

class Connection extends EventEmitter {
	constructor(config) {
		super();

		config = Object.assign({}, config, config.options);
		delete config.options;

		if (!config.connectionString) {
			if (typeof config.instanceName !== 'string' || config.instanceName.match(/^MSSQLSERVER$/i)) {
				config.instanceName = '';
			}
			config.connectionString = (config.driver ? `Driver={${ config.driver }};` : '') +
				`Server=${ config.server ? config.server : 'localhost' }${ config.port ? `,${ config.port }` : ''}\\${ config.instanceName };` +
				(config.database ? `Database=${ config.database };` : '') +
				(config.trustedConnection ? 'Trusted_Connection=yes;' : `Uid=${ config.userName || '' };Pwd=${ config.password || '' };`);
		}

		this.uuid = uuid.v4();
		this.config = config;
		this.connection = null;
		this.requests = [];

		this.config.options = {
			fetchMode: 3
		};

		Promise.resolve().then(() => {
			let match = this.config.connectionString.match(/(?:^\s*Driver\s*=)|(?:;\s*Driver\s*=)/i);
			if (!match) {
				return detectDriver().then((driver) => {
					this.config.driver = driver;
					this.config.connectionString = `Driver={${ driver }};${ this.config.connectionString }`;
				});
			}
		}).then(() => {
			this.connect();
		}).catch((err) => {
			this.emit('connect', errors.formatError(err));
		});
	}

	get closed() {
		return this.connection === null || !this.connection.connected;
	}

	get loggedIn() {
		return this.connection && this.connection.connected;
	}

	connect() {
		odbc.open(this.config.connectionString, this.config.options, (err, conn) => {
			if (!err) {
				debug(`connection (${ this.uuid }): opened`);
				this.connection = conn;
			}
			this.emit('connect', errors.formatError(err));
		});
	}

	close() {
		if (this.connection !== null) {
			this.connection.close((err) => {
				this.connection = null;
				this.emit('end', errors.formatError(err));
			});
		} else {
			this.emit('end', new Error('connection already closed'));
		}
		this.requests.slice().forEach((request) => this.removeRequest(request, new Error('connection closed')));
		debug(`connection (${ this.uuid }): closed`);
	}

	beginTransaction(callback, name, isolationLevel) {
		name = name ? ` [${ name }]` : '';
		let level = constants.ISOLATION_LEVEL[isolationLevel];
		let request = new Request(`${ level ? `SET TRANSACTION ISOLATION LEVEL ${ level }; ` : '' }BEGIN TRANSACTION${ name };`, callback);
		request.execute(this);
	}

	commitTransaction(callback, name) {
		name = name ? ` [${ name }]` : '';
		let request = new Request(`COMMIT TRANSACTION${ name };`, callback);
		request.execute(this);
	}

	rollbackTransaction(callback, name) {
		name = name ? ` [${ name }]` : '';
		let request = new Request(`ROLLBACK TRANSACTION${ name };`, callback);
		request.execute(this);
	}

	saveTransaction(callback, name) {
		if (!name) {
			callback(new Error('name required for transaction savepoint'));
			return;
		}
		name = ` [${ name }]`;
		let request = new Request(`SAVE TRANSACTION${ name };`, callback);
		request.execute(this);
	}

	execSql(request) {
		request.execute(this);
	}

	removeRequest(request, error) {
		debug(`connection (${ this.uuid }): removing request (${ request.uuid })`);
		let index = this.requests.indexOf(request);
		if (index !== -1) {
			this.requests.splice(index, 1);
			if (error && typeof request.callback === 'function') {
				request.callback(error);
			}
		}
	}
}

module.exports = Connection;
