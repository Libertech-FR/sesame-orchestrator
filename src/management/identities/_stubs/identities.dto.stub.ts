import { IdentitiesUpdateDto } from './../_dto/identities.dto';
import { IdentitiesDto } from '~/management/identities/_dto/identities.dto';
import { IdentityLifecycleDefault } from '~/management/identities/_enums/lifecycle.enum';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { additionalFieldsPartDtoStub } from './_parts/addtionalFields.dto.stub';
import { inetOrgPersonDtoStub } from './_parts/inetOrgPerson.dto.stub';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';
import { DataStatusEnum } from '~/management/identities/_enums/data-status';

export const IdentitiesDtoStub = (): IdentitiesDto => {
  return {
    state: IdentityState.TO_CREATE,
    lifecycle: IdentityLifecycleDefault.INACTIVE,
    inetOrgPerson: inetOrgPersonDtoStub(),
    additionalFields: additionalFieldsPartDtoStub(),
    initState: InitStatesEnum.NOSENT,
    dataStatus: DataStatusEnum.ACTIVE,
  };
};

export const IdentitiesUpdateDtoStub = (): IdentitiesUpdateDto => {
  const inetOrgPerson = inetOrgPersonDtoStub();
  inetOrgPerson.cn = 'updated-cn';
  return {
    state: IdentityState.TO_COMPLETE,
    lifecycle: IdentityLifecycleDefault.INACTIVE,
    initState: InitStatesEnum.NOSENT,
    dataStatus: DataStatusEnum.ACTIVE,
    inetOrgPerson,
    additionalFields: additionalFieldsPartDtoStub(),
  };
};
