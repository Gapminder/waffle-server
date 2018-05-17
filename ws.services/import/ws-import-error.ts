export class WsImportError extends Error {
  public constructor(message: string, extraInfoParam?: any, originError?: Error) {
    super();

    let extraInfo = '';

    try {
      extraInfo = (typeof extraInfo === 'object') ? JSON.stringify(extraInfoParam) : extraInfoParam;
    } catch (e) {
      extraInfo = extraInfoParam;
    }

    this.name = 'WaffleServerImportError';
    this.message = `${message}\n###extra info:\n${extraInfo}`;

    Error.captureStackTrace(this, WsImportError);
  }
}
