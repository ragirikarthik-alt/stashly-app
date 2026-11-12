jest.mock('react-native-file-access', () => ({ Dirs: {}, FileSystem: {} }));
jest.mock('@react-native-documents/picker', () => ({ types: {}, errorCodes: {} }));
jest.mock('react-native-image-picker', () => ({}));
jest.mock('../src/database/repositories', () => ({}));
jest.mock('../src/services/images', () => ({}));

const { validateBackup } = require('../src/services/backup');

const base = () => ({
  format: 'stashly-backup',
  version: 1,
  goals: [{ id: 'g', name: 'Phone', targetAmount: 1000, currencyCode: 'INR', status: 'ACTIVE' }],
  transactions: [{ id: 't', goalId: 'g', type: 'CONTRIBUTION', amount: 100, date: '2026-11-10' }],
  milestones: [{ key: 'first_contribution', achievedAt: '2026-11-10T00:00:00Z' }],
});

describe('backup validation', () => {
  test('accepts a valid backup', () => {
    const b = validateBackup(base());
    expect(b.goals).toHaveLength(1);
    expect(b.transactions).toHaveLength(1);
  });

  test('rejects foreign files and newer versions', () => {
    expect(() => validateBackup({ hello: 1 })).toThrow('not a Stashly backup');
    expect(() => validateBackup({ ...base(), version: 99 })).toThrow('newer version');
  });

  test('rejects float or negative amounts and orphan transactions', () => {
    const b1 = base();
    b1.transactions[0].amount = 1.5;
    expect(() => validateBackup(b1)).toThrow('invalid transaction');
    const b2 = base();
    b2.transactions[0].goalId = 'missing';
    expect(() => validateBackup(b2)).toThrow('invalid transaction');
    const b3 = base();
    b3.goals[0].targetAmount = -1;
    expect(() => validateBackup(b3)).toThrow('invalid goal');
    const b4 = base();
    b4.transactions[0].date = '2026-02-30';
    expect(() => validateBackup(b4)).toThrow('invalid transaction');
  });
});
