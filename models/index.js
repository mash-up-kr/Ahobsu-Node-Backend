'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const db = {};

const options =
  process.env.NODE_ENV === 'test'
    ? {
        username: 'root',
        password: 'root',
        storage: ':memory:',
        host: 'localhost',
        dialect: 'sqlite',
        operatorsAliases: false,
        logging: false,
      }
    : {
        host: config.host,
        dialect: 'mysql',
        timezone: '+09:00',
        operatorsAliases: false,
        define: {
          timestamps: true,
        },
        dialectOptions: {
          dateStrings: true,
          typeCast: true,
        },
        pool: {
          min: 0,
          max: 10,
          idle: 10000,
          acquire: 10000,
        },
        logging: false,
      };

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config.options);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, options);
}

fs.readdirSync(__dirname)
  .filter(file => {
    return file.indexOf('.') !== 0 && file !== 'index.js' && file !== 'www.js' && file.slice(-3) === '.js';
  })
  .forEach(file => {
    const model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
