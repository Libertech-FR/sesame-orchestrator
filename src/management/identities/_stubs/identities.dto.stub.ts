import { IdentitiesUpdateDto } from './../_dto/identities.dto';
import { IdentitiesDto } from '~/management/identities/_dto/identities.dto';
import { IdentityLifecycle } from '~/management/identities/_enums/lifecycle.enum';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { additionalFieldsPartDtoStub } from './_parts/addtionalFields.dto.stub';
import { inetOrgPersonDtoStub } from './_parts/inetOrgPerson.dto.stub';
import { InitStatesEnum } from '~/management/identities/_enums/init-state.enum';

export const IdentitiesDtoStub = (): IdentitiesDto => {
  return {
    state: IdentityState.TO_CREATE,
    lifecycle: IdentityLifecycle.INACTIVE,
    inetOrgPerson: inetOrgPersonDtoStub(),
    additionalFields: additionalFieldsPartDtoStub(),
    initState: InitStatesEnum.NOSENT,
  };
};

export const IdentitiesUpdateDtoStub = (): IdentitiesUpdateDto => {
  const inetOrgPerson = inetOrgPersonDtoStub();
  inetOrgPerson.cn = 'updated-cn';
  return {
    state: IdentityState.TO_COMPLETE,
    lifecycle: IdentityLifecycle.INACTIVE,
    initState: InitStatesEnum.NOSENT,
    inetOrgPerson,
    additionalFields: additionalFieldsPartDtoStub(),
  };
};
