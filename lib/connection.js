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
const odbc = require('@ratanakvlun/node-odbc');

const errors = require('./errors.js');
const constants = require('./constants.js');
const utils = require('./utils.js');

const Request = require('./request.js');

class Connection extends EventEmitter {
	constructor(config) {
		super();

		config = Object.assign({}, config.options, config);
		delete config.options;
		config.driverOptions = {
			fetchMode: 3
		};

		const driverOptionMap = {
			'connectTimeout': 'loginTimeout',
			'requestTimeout': 'queryTimeout'
		};

		for (let option in driverOptionMap) {
			let value = config[option];
			if (typeof value !== 'undefined') {
				config.driverOptions[driverOptionMap[option]] = value;
				delete config[option];
			}
		}

		if (!config.connectionString) {
			if (typeof config.instanceName !== 'string' || config.instanceName.match(/^MSSQLSERVER$/i)) {
				config.instanceName = '';
			}
			config.connectionString = (config.driver ? `Driver={${ config.driver }};` : '') +
				`Server=${ config.server ? config.server : 'localhost' }${ config.port ? `,${ config.port }` : '' }\\${ config.instanceName };` +
				(config.database ? `Database=${ config.database };` : '') +
				(config.trustedConnection ? 'Trusted_Connection=yes;' : `Uid=${ config.userName || '' };Pwd=${ config.password || '' };`);
		}

		this.uuid = uuid.v4();
		this.config = config;
		this.connection = null;
		this.requests = [];

		Promise.resolve().then(() => {
			let match = this.config.connectionString.match(/(?:^\s*Driver\s*=)|(?:;\s*Driver\s*=)/i);
			if (!match) {
				return utils.detectDriver().then((driver) => {
					this.config.driver = driver;
					this.config.connectionString = `Driver={${ driver }};${ this.config.connectionString }`;
				});
			}
		}).then(() => {
			this.connect();
		}).catch((err) => {
			this.emit('connect', err);
		});
	}

	get closed() {
		return this.connection === null || !this.connection.connected;
	}

	get loggedIn() {
		return this.connection && this.connection.connected;
	}

	connect() {
		odbc.open(this.config.connectionString, this.config.driverOptions, (err, conn) => {
			if (!err) {
				debug(`connection (${ this.uuid }): opened`);
				this.connection = conn;
			}
			this.emit('connect', errors.formatDriverError(err));
		});
	}

	close() {
		if (this.connection !== null) {
			this.connection.close((err) => {
				this.connection = null;
				this.emit('end', errors.formatDriverError(err));
			});
		} else {
			this.emit('end', errors.createError('Connection already closed', 'ENOOP'));
		}
		this.requests.slice().forEach((request) => {
			this.removeRequest(request, errors.createError('Connection closed', 'ECANCEL'));
		});
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
			throw errors.createError('Name required for transaction savepoint', 'EINVALID');
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
