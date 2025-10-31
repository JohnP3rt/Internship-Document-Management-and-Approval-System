const app = require('./app');
const config = require('./config/config');

const server = app.listen(config.PORT, () => {
  console.clear();  
  console.log('=================================');
  console.log(`Server is running`);
  console.log(`Access the app at: http://localhost:${config.PORT}`);
  console.log('=================================');
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
