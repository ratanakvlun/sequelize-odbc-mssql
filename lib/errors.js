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

function createError(err, code) {
	let e;

	if (err instanceof Error) {
		e = new Error(err.message);
	} else {
		e = new Error(err);
	}

	Error.captureStackTrace(e, createError);

	if (code) {
		e.code = code;
	}

	return e;
}

function formatDriverError(err) {
	if (!err) {
		return err;
	}

	let match = err.message.match(/^\[.+?\]((?:\w|\s).+)$/);
	let e = new Error(match ? match[1] : err.message);

	Error.captureStackTrace(e, formatDriverError);

	if (err.state) {
		e.sqlmessage = err.message;
		e.sqlstate = err.state;
		e.sqlcode = err.code;
	}

	if (e.sqlstate === '08001' && (e.sqlcode === 11001 || err.sqlcode === 53)) {
		e.message = `${ e.message } (getaddrinfo ENOTFOUND)`;
		e.code = 'ESOCKET';
	} else if (e.sqlstate === '08001' && (e.sqlcode === 10049 || e.sqlcode === 1214)) {
		e.message = `${ e.message } (connect EHOSTUNREACH)`;
		e.code = 'ESOCKET';
	} else if (e.sqlstate === '08001' && e.sqlcode === 10061) {
		e.message = `${ e.message } (connect ECONNREFUSED)`;
		e.code = 'ESOCKET';
	} else if (e.sqlstate === '28000' && e.sqlcode === 18456) {
		e.code = 'ELOGIN';
	} else if (e.sqlstate === '42000' && e.sqlcode === 1767) {
		e.message = `${ e.message } (Could not create constraint)`;
		e.code = 'EINVALID';
	} else if (e.sqlstate === '42000' && e.sqlcode === 3728) {
		e.message = `${ e.message } (Could not drop constraint. See previous errors.)`;
		e.code = 'EINVALID';
	}

	return e;
}

module.exports = {
	createError,
	formatDriverError
};
