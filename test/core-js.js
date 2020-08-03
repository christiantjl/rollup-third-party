
import test from 'ava';
import shell from 'await-shell';

console.log(`------
core-js.js
------`);
test('Executing bundle for core-js.js should not throw', async (t) => {
  try {
    await shell('node ./bundles/core-js.js');
  } catch (e) {
    t.log(e);
    return t.fail();
  }
  t.pass();
});
