import { Types } from 'mongoose';
import { normalizeMongoFilterValues } from '~/_common/functions/normalize-mongo-filter-values';

describe('normalizeMongoFilterValues', () => {
  it('re-hydrates foreign ObjectId instances', () => {
    const foreignObjectId = {
      _bsontype: 'ObjectId',
      id: Buffer.from('6852cc6780ae416061df5323', 'hex'),
      toString: () => '6852cc6780ae416061df5323',
    };

    const filter = {
      'concernedTo.id': foreignObjectId,
      lifecycle: { $in: ['I', 'W'] },
    };

    const normalized = normalizeMongoFilterValues(filter);

    expect(normalized['concernedTo.id']).toBeInstanceOf(Types.ObjectId);
    expect(normalized['concernedTo.id'].toString()).toBe('6852cc6780ae416061df5323');
  });

  it('keeps native ObjectId instances unchanged', () => {
    const nativeObjectId = new Types.ObjectId('6852cc6780ae416061df5323');
    const normalized = normalizeMongoFilterValues({ id: nativeObjectId });

    expect(normalized.id).toBe(nativeObjectId);
  });

  it('normalizes ObjectIds nested in operators', () => {
    const foreignObjectId = {
      _bsontype: 'ObjectId',
      toString: () => '6852cc6780ae416061df5323',
    };

    const normalized = normalizeMongoFilterValues({
      _id: { $in: [foreignObjectId, '6852cc6780ae416061df5323'] },
    });

    expect(normalized._id.$in[0]).toBeInstanceOf(Types.ObjectId);
    expect(normalized._id.$in[1]).toBe('6852cc6780ae416061df5323');
  });
});
