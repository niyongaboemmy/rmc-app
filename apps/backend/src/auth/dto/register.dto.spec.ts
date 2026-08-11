import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { RegisterDto } from './register.dto';

/**
 * Guards the DTO against the payload the register form actually sends, which is
 * not the same as the payload the DTO's example shows. The optional fields are
 * the trap: `@IsOptional()` skips validation for `undefined` and `null` only, so
 * an untouched `<select>` or `<input type="date">` — both of which submit `''` —
 * reaches the validator and is judged against rules empty string cannot meet.
 */
describe('RegisterDto', () => {
  const base = {
    email: 'ahmed@example.com',
    phone: '+250781234567',
    password: 'Password1!',
    firstName: 'Ahmed',
    lastName: 'Hassan',
  };

  const check = async (payload: object) => {
    const errors = await validate(plainToInstance(RegisterDto, payload));
    return errors.flatMap((e) => Object.values(e.constraints ?? {}));
  };

  it('accepts the minimum payload', async () => {
    expect(await check(base)).toEqual([]);
  });

  it('accepts an untouched gender select', async () => {
    // The Select renders a disabled `value=""` placeholder as the initial option,
    // so a user who never opens the dropdown submits ''. Rejecting that turns an
    // optional field into a required one, with a message that says neither.
    expect(await check({ ...base, gender: '' })).toEqual([]);
  });

  it('accepts an untouched date of birth', async () => {
    expect(await check({ ...base, dateOfBirth: '' })).toEqual([]);
  });

  it('still rejects a nonsense gender', async () => {
    expect(await check({ ...base, gender: 'banana' })).not.toEqual([]);
  });

  it('still rejects a nonsense date of birth', async () => {
    expect(await check({ ...base, dateOfBirth: 'not-a-date' })).not.toEqual([]);
  });

  it('accepts symbols the old whitelist refused', async () => {
    // `+` and `(` were not in [@$!%*?&\-_#], so these failed server-side after
    // passing every check the user could see.
    expect(await check({ ...base, password: 'Password1+' })).toEqual([]);
    expect(await check({ ...base, password: 'Str0ng(pass)' })).toEqual([]);
  });

  it('rejects a password missing a character class', async () => {
    expect(await check({ ...base, password: 'password1!' })).not.toEqual([]); // no uppercase
    expect(await check({ ...base, password: 'Password!!' })).not.toEqual([]); // no digit
    expect(await check({ ...base, password: 'Password11' })).not.toEqual([]); // no symbol
  });

  it('rejects a password with spaces', async () => {
    expect(await check({ ...base, password: 'Pass word1!' })).not.toEqual([]);
  });
});
