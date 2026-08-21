import { app, ensureInit } from "../server/index.js";

let initialized = false;

export default async function handler(req, res) {
  if (!initialized) {
    await ensureInit();
    initialized = true;
  }
  return app(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
