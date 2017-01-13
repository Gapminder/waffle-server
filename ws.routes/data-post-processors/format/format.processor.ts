import * as formatService from '../../../ws.services/format.service';

function format(data, formatType: string, cb: Function) {
  return (formatService[formatType] || formatService['default'])(data, cb);
}

export {
  format
};

