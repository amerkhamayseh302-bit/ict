import { catalog } from "../src/features/catalog";

const timeoutMs = 10_000;
const concurrency = 5;
const queue = [...catalog];
const failures: string[] = [];

async function checkOne(item: (typeof queue)[number]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(item.url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(item.url, { method: "GET", redirect: "follow", signal: controller.signal, headers: { Range: "bytes=0-0" } });
    }
    if (!response.ok) failures.push(`${response.status} ${item.url} (${item.slug})`);
    else console.log(`OK ${response.status} ${item.url}`);
  } catch (error) {
    failures.push(`${error instanceof Error ? error.message : "request failed"} ${item.url} (${item.slug})`);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) await checkOne(queue.shift()!);
  }));

  if (failures.length) {
    console.error(`\n${failures.length} link(s) need review:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("All catalogue links responded successfully.");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
