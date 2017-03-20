import * as _ from 'lodash';
import { constants } from '../ws.utils/constants';
import { Types } from 'mongoose';

export abstract class VersionedModelRepository {
  protected versionQueryFragment: any;
  protected datasetId: any;
  protected version: string;

  public constructor(versionQueryFragment: any, datasetId?: any, version?: string) {
    this.versionQueryFragment = versionQueryFragment;
    this.datasetId = datasetId;
    this.version = version;
  }

  protected abstract _getModel(): any

  protected _composeQuery(... args: any[]): any {
    return _.merge.bind(_, {}, this.versionQueryFragment).apply(undefined, args);
  }

  public create(documents: any, onCreated?: Function): any {
    const documentsForStoring = Array.isArray(documents) ? this.setId(documents) : this.setId([documents]);
    return this._getModel().insertMany(documentsForStoring, onCreated);
  }

  protected setId(documents: any[]): any[] {
    _.forEach(documents, (document: any) => {
      const id = Types.ObjectId();
      document._id = id;
      if (!document.originId) {
        document.originId = id;
      }
    });
    return documents;
  }

  protected _normalizeWhereClause(where: any): any {
    return _.reduce(where, normalizeValue, {});

    function normalizeValue(result: any, setOfValues: any, key: string): any {
      // geo.is--country
      if ( _.includes(key, `.${constants.IS_OPERATOR}`) ) {
        result[key] = !!_.first(setOfValues);

        return result;
      }

      // time = 1800,1900,2000
      // time = 1900, 1905, 1910:1920, 1930
      // geo = usa, ukr, dza
      if ( _.isArray(setOfValues) ) {
        const restoredValues = _.flatMap(setOfValues, (value: any) => {
          if (_.isArray(value)) {
            return _.range(_.first(value) as number, (_.last(value) as number) + 1);
          }

          return [value];
        });

        result[key] = {$in: restoredValues};

        return result;
      }

      result[key] = setOfValues;

      return result;
    }
  }
}
