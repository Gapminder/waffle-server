const fastify = require('fastify')();

export default class FastifyApp {
  public fastify: any;
  public services: {} = {};
  public get(name: string): any {
    if (arguments.length === 1) {
      const service = arguments[0];
      return this.services[service];
    }
    return (fastify as any).get(name, arguments[1], arguments[2]);
  }

  public set(name: string, val: any): any {
    this.services[name] = val;
  }

  public listen(port: number, cb: Function): any {
    return (fastify as any).listen(port, cb);
  }

  public use(middleware: any ): any {
    (fastify as any).use(middleware);
  }

  public constructor() {
    this.fastify = fastify;
  }
}
