import { toPrecision } from './toPrecision.processor';

export {
  toPrecisionMiddleware
};

function toPrecisionMiddleware (req: any, res: any, next: Function): void {
  if (req.wsJson && req.wsJson.rows) {
    req.wsJson.rows = toPrecision(req.wsJson.rows, null, req.query.precisionLevel);
  }
  next();
}
