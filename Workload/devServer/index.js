/**
 * DevServer APIs index file
 * Exports all API routers for the dev server
 */

const manifestApi = require('./manifestApi');
const schemaApi = require('./schemaApi');
const lakehouseApi = require('./lakehouseApi');

/**
 * Register all dev server APIs with an Express application
 * @param {object} app Express application
 */
function registerDevServerApis(app) {
  console.log('*** Mounting Manifest API ***');
  app.use('/', manifestApi);
  app.use('/', schemaApi);
  console.log('*** Mounting Lakehouse API ***');
  app.use('/', lakehouseApi);
}

module.exports = {
  manifestApi,
  registerDevServerApis
};
