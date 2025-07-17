import { IsEnum } from "class-validator";

export class ConfigObjectStatusDTO {
  public sources: string[];

  public rule: any;

  // @IsEnum()
  public target: string;
}

export class ConfigObjectRuleDTO {

}

export class ConfigObjectSchemaDTO {
  public status: ConfigObjectStatusDTO[]
}
