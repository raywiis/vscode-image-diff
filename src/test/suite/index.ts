import * as path from "path";
import Mocha from "mocha";
import { globSync } from "glob";

export function run(
  _: string,
  callback: (error: unknown, failures?: number) => void,
) {
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
  });

  const testsRoot = path.resolve(__dirname, "..");
  const files = globSync("**/**.test.js", { cwd: testsRoot });
  files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

  try {
    mocha.run((failures) => {
      if (failures > 0) {
        callback(null, failures);
        throw new Error(`${failures} tests failed.`);
      } else {
        callback(null);
      }
    });
  } catch (err) {
    callback(err);
  }
}
