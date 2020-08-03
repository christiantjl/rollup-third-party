
import test from 'ava';
import shell from 'await-shell';

test('Executing bundle for underscore.js should not throw', async (t) => {
  try {
    await shell('node ./bundles/underscore.js');
  } catch (e) {
    return t.fail(e);
  }
  t.pass();
});
