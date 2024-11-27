import { inetOrgPersonDto } from '~/management/identities/_dto/_parts/inetOrgPerson.dto';

export const inetOrgPersonDtoStub = (): inetOrgPersonDto => {
  return {
    cn: 'cn',
    sn: 'sn',
    uid: 'uid',
    employeeNumber: ['employeeNumber'],
    employeeType: 'employeeType',
    departmentNumber: ['departmentNumber'],
    displayName: 'displayName',
    facsimileTelephoneNumber: 'facsimileTelephoneNumber',
    givenName: 'givenName',
    labeledURI: 'labeledURI',
    mail: 'mail',
    mobile: 'mobile',
    postalAddress: 'postalAddress',
    preferredLanguage: 'preferredLanguage',
    telephoneNumber: 'telephoneNumber',
    title: 'title',
    userCertificate: 'userCertificate',
  };
};
