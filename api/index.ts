import serverless from 'serverless-http';
import app from '../server/dist/index';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default serverless(app);