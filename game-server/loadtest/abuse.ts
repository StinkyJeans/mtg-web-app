// Throws nonsense at a running server (start it with DEV_AUTH=1) and checks it stays up and keeps answering:
//   HOST=localhost:2598 npx tsx loadtest/abuse.ts
import { Client } from "@colyseus/sdk";

const HOST = process.env.HOST ?? "localhost:2567";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const junk: unknown[] = [null, undefined, 0, -1, 1e308, NaN, "", "x".repeat(70_000), [], [[[]]], {}, { action: null }, { action: { type: "nope" } }, { action: { type: "castSpell", iid: {}, targets: "x" } }, { action: { type: "declareAttackers", attackers: "all" } }, { action: { type: "assignDamage", assignments: [{ amount: -5 }] } }, { __proto__: { polluted: true } }, JSON.parse('{"__proto__":{"x":1}}'), { name: "a".repeat(10_000) }, { ids: Array(100_000).fill("mountain") }, { size: "60" }, { token: 5 }];
const types = ["action", "deck", "look", "chat", "vote", "startVote", "addBot", "removeBot", "order", "call", "endTurn", "kick", "hello", "unknown", "constructor", "__proto__", "toString"];
let sent = 0;
let errors = 0;
let dropped = 0;

async function health() {
  const r = await fetch(`http://${HOST}/load`);
  return (await r.json()) as { rooms: number; eventLoopDelay: { p99: number; max: number } };
}

const before = await health().catch(() => (console.error(`No server at ${HOST}.`), process.exit(1)));
console.log("before:", JSON.stringify(before));
const clients = await Promise.all(
  Array.from({ length: 12 }, async (_, i) => {
    const c = new Client(`ws://${HOST}`);
    const room = await c.create("match", { name: `abuse ${i}`, token: `dev:abuse${i}` });
    room.onMessage("*" as never, () => {});
    room.onError(() => errors++);
    room.onLeave(() => dropped++);
    return room;
  }),
);
for (let round = 0; round < 40; round++) {
  for (const room of clients) {
    for (const t of types) for (const j of junk) {
      try {
        room.send(t, j);
        sent++;
      } catch {
        errors++;
      }
    }
  }
  await sleep(50);
}
// a joiner with bad tokens and bad room options
for (const token of [undefined, "", "dev:", "dev:" + "z".repeat(5000), "x".repeat(10_000), "dev:a/b?c"]) {
  await new Client(`ws://${HOST}`).create("match", { name: "t", token }).then((r) => r.leave(), () => {});
  await new Client(`ws://${HOST}`).joinById("nope", { token }).catch(() => {});
}
await sleep(3000);
const after = await health().catch(() => null);
console.log(`sent ${sent} junk messages from 12 clients; ${dropped} clients were cut off (the flood limit), ${errors} client errors`);
console.log("after: ", JSON.stringify(after));
console.log(after ? "server is still up and answering" : "SERVER DOWN");
process.exit(after ? 0 : 1);
