import test from 'ava';
import { createUmi } from './_setup';

test('it registers the program', async (t) => {
  // Given a Umi instance using the project's plugin.
  const umi = await createUmi();

  // When we fetch the registered program.
  const program = umi.programs.get('tokenRecipes');

  // Then we expect it to be the same as the program ID constant.
  t.true(program.publicKey === 'C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T');
});
