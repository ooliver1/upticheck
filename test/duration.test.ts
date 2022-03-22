// really sorry but i like tests now

import durationToHuman from "../src/duration";

test("duration singular", () => {
  expect(durationToHuman(1)).toEqual("1 second");
});
