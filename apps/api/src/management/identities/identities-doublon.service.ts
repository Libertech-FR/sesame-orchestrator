import { AbstractIdentitiesService } from '~/management/identities/abstract-identities.service';
import { IdentityState } from '~/management/identities/_enums/states.enum';
import { Identities } from '~/management/identities/_schemas/identities.schema';
import { BadRequestException } from '@nestjs/common';
import { sort } from 'radash'
export class IdentitiesDoublonService extends AbstractIdentitiesService {
  public async searchDoubles() {
    const agg1 = [
      {
        $match: {
          deletedFlag: { $eq: false},
          state: { $ne: IdentityState.DONT_SYNC },
          destFusionId: { $eq: null },
          'inetOrgPerson.employeeType': {$ne: 'LOCAL'},
        },
      },
      {
        $addFields: {
          test: {
            $concat: [
              '$additionalFields.attributes.supannPerson.supannOIDCDatedeNaissance',
              '$inetOrgPerson.givenName',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$test',
          n: {
            $sum: 1,
          },
          list: {
            $addToSet: {
              _id: '$_id',
              uid: '$inetOrgPerson.uid',
              cn: '$inetOrgPerson.cn',
              employeeNumber: '$inetOrgPerson.employeeNumber',
              departmentNumber: '$inetOrgPerson.departmentNumber',
              state: '$state',
              lastSync: '$lastSync',
            },
          },
        },
      },
      {
        $match: {
          n: {
            $gt: 1,
          },
        },
      }
    ];
    const agg2 = [
      {
        $match: {
          deletedFlag: { $eq: false},
          state: { $ne: IdentityState.DONT_SYNC },
          destFusionId: { $eq: null },
          'inetOrgPerson.employeeType': {$ne: 'LOCAL'},

        },
      },
      {
        $group: {
          _id: '$inetOrgPerson.uid',
          n: {
            $sum: 1,
          },
          list: {
            $addToSet: {
              _id: '$_id',
              uid: '$inetOrgPerson.uid',
              cn: '$inetOrgPerson.cn',
              employeeNumber: '$inetOrgPerson.employeeNumber',
              departmentNumber: '$inetOrgPerson.departmentNumber',
              state: '$state',
              lastSync: '$lastSync',
            },
          },
        },
      },
      {
        $match: {
          n: {
            $gt: 1,
          },
        },
      },
    ];
    const result1 = await this._model.aggregate(agg1);
    const result2 = await this._model.aggregate(agg2);
    const result3 = result1.map((x) => {
      const k = x.list[0]._id + '/' + x.list[1]._id;
      const k1 = x.list[1]._id + '/' + x.list[0]._id;
      return { k1: k1, k: k, key1: x.list[0]._id, key2: x.list[1]._id, data: x.list };
    });
    const result4 = result2.map((x) => {
      const k = x.list[0]._id + '/' + x.list[1]._id;
      const k1 = x.list[1]._id + '/' + x.list[0]._id;
      return { k1: k1, k: k, key1: x.list[0]._id, key2: x.list[1]._id, data: x.list };
    });
    result4.forEach((x) => {
      const r = result3.find((o) => o.k === x.k);
      const r1 = result3.find((o) => o.k1 === x.k);
      if (r === undefined && r1 === undefined) {
        result3.push(x);
      }
    });
    result3.sort((a, b) => {
      const cnA = a.data[0].cn?.toLowerCase() ?? '';
      const cnB = b.data[0].cn?.toLowerCase() ?? '';
      return cnA.localeCompare(cnB);
    });
    return result3;
  }
  //fusionne les deux identités id2 > id1 les champs presents dans id2 et non present dans id1 seront ajoutés
  // retourne l'id de na nouvelle identité créée
  public async fusion(id1, id2) {
    let identity1: Identities = null;
    let identity2: Identities & any = null;
    try {
      identity1 = await this.findById<Identities>(id1);
    } catch (error) {
      throw new BadRequestException('Id1 not found');
    }
    try {
      identity2 = await this.findById<Identities>(id2);
    } catch (error) {
      throw new BadRequestException('Id2  not found');
    }
    //test si une ou les  deux entités ont deja été fusionnées
    if (identity1.destFusionId !== undefined && identity1.destFusionId !== null) {
      throw new BadRequestException('Id1 est déjà fusionnée');
    }
    if (identity2.destFusionId !== undefined && identity2.destFusionId !== null) {
      throw new BadRequestException('Id2 est déjà fusionnée');
    }
    //pour savoir qu elle est l'identité maitre seule celle-ci sera mise à jour par taiga
    identity1.primaryEmployeeNumber = identity1.inetOrgPerson.employeeNumber[0];

    identity1.inetOrgPerson.employeeNumber = [
      ...identity1.inetOrgPerson.employeeNumber,
      ...identity2.inetOrgPerson.employeeNumber,
    ];
    identity1.inetOrgPerson.departmentNumber = [
      ...identity1.inetOrgPerson.departmentNumber,
      ...identity2.inetOrgPerson.departmentNumber,
    ];
    // si supann est present
    if (
      identity1.additionalFields.objectClasses.includes('supannPerson') &&
      identity2.additionalFields.objectClasses.includes('supannPerson')
    ) {
      if (identity2.additionalFields.attributes.supannPerson.supannTypeEntiteAffectation ) {
        identity2.additionalFields.attributes.supannPerson.supannTypeEntiteAffectation.forEach((depN) => {
          (identity1.additionalFields.attributes.supannPerson as any).supannTypeEntiteAffectation.push(depN);
        });
      }
      // supannRefId
      if (identity2.additionalFields.attributes.supannPerson.supannRefId ){
        identity2.additionalFields.attributes.supannPerson.supannRefId.forEach((depN) => {
          (identity1.additionalFields.attributes.supannPerson as any).supannRefId.push(depN);
        });
      }
    }
    identity1.state = IdentityState.TO_VALIDATE;
    identity1.srcFusionId = identity2._id;
    identity2.destFusionId = identity1._id;
    identity2.inetOrgPerson.employeeNumber[0] = 'F' + identity2.inetOrgPerson.employeeNumber[0];
    //delete identity2 si elle a deja été synchro ?
    if (identity2.lastBackendSync !== null) {
      await this.backends.deleteIdentities([identity2._id.toString()]);
    }
    identity2.state = IdentityState.DONT_SYNC;
    // modification identité2
    await super.update(identity2._id, identity2);
    // modification identité1
    await super.update(identity1._id, identity1);
    return identity1._id;
  }
}
