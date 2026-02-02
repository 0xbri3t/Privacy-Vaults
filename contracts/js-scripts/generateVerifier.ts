import { UltraHonkBackend } from "@aztec/bb.js";
import fs from "fs";
import path from "path";

const circuit = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../circuits/target/circuits.json"), "utf8")
);

async function main() {
  const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
  const verifier = await honk.getSolidityVerifier();
  fs.writeFileSync(path.resolve(__dirname, "../src/Verifier.sol"), verifier);
  console.log("Verifier.sol written");
  process.exit(0);
}

main().catch(console.error);
