import createError from 'http-errors';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import basicAuth from 'express-basic-auth';
import 'dotenv/config';
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(basicAuth({
  users: {'yt': 'gimmethetext'},
  challenge: true,
  realm: '1mp0ss1b13',
}));

// view engine setup
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(join(__dirname, './public')));

const redisUrl = process.env.REDIS_URL;
if (app.get('env') === 'production' && !redisUrl) {
  throw new Error('REDIS_URL is required for production sessions');
}

let store;
if (redisUrl) {
  const redisClient = createClient({
    url: redisUrl,
    disableOfflineQueue: true,
    socket: { reconnectStrategy: retries => Math.min(100 * 2 ** retries, 5000) }
  });
  redisClient.on('error', error => console.error('Redis session store:', error.message));
  await redisClient.connect();
  store = new RedisStore({ client: redisClient });
}

app.use(session({
  store,
  secret: 'cute cat video!',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

export default app;
