import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractServiceSchema } from '~/_common/abstracts/abstract.service.schema';
import { Settings } from '~/settings/_schemas/settings.schema';

export class AbstractSettingsService<T extends Settings = Settings> extends AbstractServiceSchema<T> {
  protected settingsName: string;

  constructor(@InjectModel(Settings.name) protected _model: Model<T>) {
    super();
  }

  protected async getParameter(settingName: string): Promise<object | null> {
    try {
      const enr = await this.findOne<Settings>({ name: settingName });
      return enr.parameters;
    } catch (e) {
      return this.defaultValues();
    }
  }

  protected async setParameter(settingName: string, parameters: object): Promise<any> {
    // const enr = new this._model({
    //   name: settingName,
    //   parameters: parameters,
    // });
    const ok = await this.upsert(
      { name: settingName },
      {
        $setOnInsert: {
          name: settingName,
        },
        $set: {
          parameters: parameters,
        },
      },
    );
    return ok;
  }

  protected async defaultValues(): Promise<object> {
    return {};
  }
}
