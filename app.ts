import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response, Express } from 'express';
import createError from 'http-errors';
import logger from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import connectDB from './connectDB';
import reutes from './routes';
import swaggerDocument from './swagger/swagger';
require('dotenv').config();

class App {
  app: Express;

  constructor() {
    this.app = express();

    // db 접속
    this.dbConnection();

    // 뷰 템플릿 엔진 셋팅
    // this.setViewEngine();

    // 세션 셋팅
    // this.setSession();

    // 미들웨어 셋팅
    this.setMiddleWare();

    // 정적 디렉토리 추가
    this.setStatic();

    // 글로벌 변수 선언
    // this.setLocals();

    // 라우팅
    this.getRouting();

    // 위의 라우팅에서 해당 라우터가 없으면 404 페이지를 찾을수가 없음 노출
    this.status404();
  }

  dbConnection() {
    // connect To DB
    connectDB();
  }

  setMiddleWare() {
    this.app.use(cors());
    this.app.use(logger('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(cookieParser());

    // error handler
    this.app.use(function(err: Error, req: Request, res: Response, next: NextFunction) {
      // set locals, only providing error in development
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};

      // render the error page
      // res.status(err.status || 500);
      res.status(500);
      res.render('error');
    });
  }

  setStatic() {
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  getRouting() {
    this.app.use('/apiDocs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    this.app.get('/', (req, res, next) => {
      res.json({ name: '유정' });
    });

    this.app.get('/favicon.ico', function(req, res, next) {});
    this.app.get('/service-worker.js', function(req, res, next) {});

    this.app.use('/api/v1', reutes);
  }

  status404() {
    // catch 404 and forward to error handler
    this.app.use(function(req, res, next) {
      next(createError(404));
    });
  }
}

const { app } = new App();

export default app;
