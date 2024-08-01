import {AbstractServiceSchema} from "~/_common/abstracts/abstract.service.schema";
import {InjectModel} from "@nestjs/mongoose";
import {Model} from "mongoose";
import {Settings, SettingsSchema} from "~/settings/_schemas/settings.schema";

export class AbstractSettingsService extends AbstractServiceSchema {
  protected settingsName: string

  constructor(@InjectModel(Settings.name) protected _model: Model<Settings>) {
    super();
  }

  protected async getParameter<T = object>(settingName: string): Promise<T | null> {
    try {
      const enr=  await this.findOne<Settings>({name: settingName})
      return <T>enr.parameters
    } catch (e) {
      return this.defaultValues<T>()
    }
  }

  protected async setParameter(settingName: string, parameters: object): Promise<any> {
    const enr = new this._model({
      name: settingName
      , parameters: parameters
    })
    const ok= await this.upsert(
      {name: settingName},
      {
        $setOnInsert: {
          name: settingName
        },
        $set: {
          "parameters": parameters
        }
      })
    return ok
  }

  protected async defaultValues<T = object>(): Promise<T> {
    return <T>{}
  }

}
