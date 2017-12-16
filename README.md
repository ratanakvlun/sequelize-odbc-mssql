[npm-url]: https://npmjs.org/package/sequelize-odbc-mssql
[npm-version-image]: https://img.shields.io/npm/v/sequelize-odbc-mssql.svg
[npm-downloads-image]: https://img.shields.io/npm/dt/sequelize-odbc-mssql.svg

# sequelize-odbc-mssql
Sequelize dialect driver for the [`@ratanakvlun/node-odbc`](https://github.com/ratanakvlun/node-odbc) module

[![npm version][npm-version-image]][npm-url] [![npm downloads][npm-downloads-image]][npm-url]

The `sequelize-odbc-mssql` module is a MSSQL dialect driver for [`sequelize`](https://github.com/sequelize/sequelize).

There are many Node.js MSSQL clients and `sequelize` defaults to using [`tedious`](https://github.com/tediousjs/tedious), but being pure Javascript,`tedious` lacks support for integrated security on Windows systems. `@ratanakvlun/node-odbc` is a client that interfaces with a native ODBC library which allows integrated security to be used.

The purpose of `sequelize-odbc-mssql` is to provide `sequelize` with a dialect driver for `@ratanakvlun/node-odbc`.

## Installation

```
npm install sequelize-odbc-mssql
```

## Usage

Using `sequelize-odbc-mssql` is simple. Just specify `sequelize-odbc-mssql` as the `dialectModulePath`:
```javascript
const Sequelize = require('sequelize');

let db = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'sequelize-odbc-mssql',
  dialectOptions: {
    /* Configuration */
  }
});
```

### Configuration

The following `sequelize` options are used by `sequelize-odbc-mssql`. Options specific to `sequelize` like pooling still apply to the `sequelize` layer.
* _database_ - Name of the database to use.
* _username_ - Username if using SQL authentication.
* _password_ - Password if using SQL authentication.
* _host_ - Hostname of the server. Default: `localhost`
* _port_ - Port if using TCP/IP to connect.
* _dialectOptions.driver_ - Name of the ODBC driver to use (e.g. SQL Server Native Client 10.0).
* _dialectOptions.instanceName_ - Name of the instance to connect to.
* _dialectOptions.trustedConnection_ - Indicates whether integrated security should be used. Default: `false`
* _dialectOptions.connectionString_ - Connection string to use. Overrides all other options if present.

If a driver is not provided in either `dialectOptions.driver` or `dialectOptions.connectionString`, `sequelize-odbc-mssql` will attempt to detect a driver.

#### Example: Using a connection string directly with `sequelize` pooling.
```javascript
let db = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'sequelize-odbc-mssql',
  dialectOptions: {
    connectionString: 'Driver={SQL Server Native Client 10.0};Server=localhost\\SQLEXPRESS;Database=finances;Trusted_Connection=yes;'
  },
  pool: {
    min: 0,
    max: 5,
    idle: 10000
  }
});
```

#### Example: Using Windows authentication.
```javascript
let db = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'sequelize-odbc-mssql',
  dialectOptions: {
    driver: 'SQL Server Native Client 10.0',
    instanceName: 'SQLEXPRESS',
    trustedConnection: true
  },
  host: 'localhost',
  database: 'finances'
});
```

#### Example: Using SQL authentication.
```javascript
let db = new Sequelize({
  dialect: 'mssql',
  dialectModulePath: 'sequelize-odbc-mssql',
  dialectOptions: {
    driver: 'SQL Server Native Client 10.0',
    instanceName: 'SQLEXPRESS'
  },
  host: 'localhost',
  username: 'sa',
  password: 'password',
  database: 'finances'
});
```
