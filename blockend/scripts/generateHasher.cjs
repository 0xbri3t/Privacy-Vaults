const fs = require("fs");
const path = require("path");
const genContract = require("circomlib/src/mimcsponge_gencontract.js");

const outputPath = path.join(__dirname, "..", "artifacts", "Hasher.json");

const contract = {
    contractName: "Hasher",
    abi: genContract.abi,
    bytecode: genContract.createCode("mimcsponge", 220),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(contract, null, 2));

console.log(outputPath);
