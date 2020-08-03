
import test from 'ava';
import shell from 'await-shell';

test('Executing bundle for glob.js should not throw', async (t) => {
  try {
    await shell('node ./bundles/glob.js');
  } catch (e) {
    return t.fail(e);
  }
  t.pass();
});
