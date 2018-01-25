import * as express from 'express';
import FastifyApp from '../fastify-wrapper';

export class ServiceLocator {
  private static DELIMITER: string = '.';
  private static SERVICE_LOCATOR: ServiceLocator;

  private application: express.Application | FastifyApp;
  private namePrefix: string;
  private servicesList: string[] = [];

  public static create(application: express.Application | FastifyApp): ServiceLocator {
    if (!application && !ServiceLocator.SERVICE_LOCATOR) {
      throw new Error('Please, supply instance of express application to the create method');
    }

    if (application && !ServiceLocator.SERVICE_LOCATOR) {
      ServiceLocator.SERVICE_LOCATOR = new ServiceLocator('waffle-server', application);
    }

    return ServiceLocator.SERVICE_LOCATOR;
  }

  public set(name: string, instance: any): ServiceLocator {
    this.application.set(this.namePrefix + name, instance);
    this.servicesList.push(name);
    return this;
  }

  public get(name: string): any {
    return this.application.get(this.namePrefix + name);
  }

  public list(): string[] {
    return this.servicesList;
  }

  public getApplication(): express.Application | FastifyApp {
    return this.application;
  }

  private constructor(namePrefix: string, application: express.Application | FastifyApp) {
    this.application = application;
    this.namePrefix = namePrefix + ServiceLocator.DELIMITER;
  }
}
