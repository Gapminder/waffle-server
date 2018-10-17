import { Response } from 'express';
import { logger } from '../../ws.config/log';
import * as routesUtils from '../utils';
import { toDataResponse, WSRequest } from '../utils';
import { loadRepositoriesConfig, RepositoriesConfig } from '../../ws.config/repos.config';

export {
  updateConfig
};

async function updateConfig(isForceLoad: boolean, req: WSRequest, res: Response): Promise<Response> {
  try {
    const reposConfig: RepositoriesConfig = await loadRepositoriesConfig(isForceLoad);

    return res.json(toDataResponse(reposConfig));
  } catch (error) {
    logger.error(error);
    return res.json(routesUtils.toErrorResponse(error, req, 'repository-config'));
  }
}
