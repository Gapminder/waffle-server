import * as formatService from '../../../ws.services/format.service';

function format(data: any, formatType: string, cb: Function): void {
  return (formatService[formatType] || formatService.default)(data, cb);
}

export {
  format
};
