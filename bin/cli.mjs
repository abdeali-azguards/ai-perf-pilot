#!/usr/bin/env node
import { main } from '../src/cli.mjs';

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
