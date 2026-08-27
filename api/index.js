const serverless = require('serverless-http');
const { default: app } = require('../server/dist/index');

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = serverless(app);