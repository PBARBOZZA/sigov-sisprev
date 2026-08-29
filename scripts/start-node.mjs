if (!process.env.NITRO_PORT) {
  process.env.NITRO_PORT = process.env.PORT || "3001";
}

if (!process.env.NITRO_HOST && !process.env.HOST) {
  process.env.NITRO_HOST = "127.0.0.1";
}

await import("../.output/server/index.mjs");
