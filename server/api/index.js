const serverless = require('serverless-http');
const { default: app } = require('../dist/index');

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = serverless(app);