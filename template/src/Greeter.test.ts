import { assert, layer } from "@effect/vitest";
import { Effect } from "effect";
import { EmptyNameError, Greeter } from "./Greeter.ts";

layer(Greeter.layer)("Greeter", (it) => {
  it.effect("greets a trimmed name", () =>
    Effect.gen(function* () {
      const greeter = yield* Greeter;

      assert.strictEqual(yield* greeter.greet("  Ada "), "Hello, Ada!");
    }),
  );

  it.effect("fails with EmptyNameError for a blank name", () =>
    Effect.gen(function* () {
      const greeter = yield* Greeter;
      const error = yield* Effect.flip(greeter.greet("   "));

      assert.instanceOf(error, EmptyNameError);
    }),
  );
});
