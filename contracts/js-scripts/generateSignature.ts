import { randomBytes } from "crypto"
import {
    encodeAbiParameters,
    parseSignature,
    type Address,
    type Hex,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"


function normalizePk(pk: string): Hex {
    // If pk comes as decimal (Forge vm.toString(uint256)), convert to 0x...32-bytes
    if (!pk.startsWith("0x")) {
        const n = BigInt(pk);
        return (`0x${n.toString(16).padStart(64, "0")}`) as Hex;
    }

    // If pk comes as hex, pad to 32 bytes
    const h = pk.slice(2);
    if (h.length > 64) throw new Error("private key too long");
    return (`0x${h.padStart(64, "0")}`) as Hex;
}

function asHexBytes32(x: string): Hex {
    if (!x.startsWith("0x")) throw new Error(`nonce must be 0x... got ${x}`)
    const h = x.slice(2)
    if (h.length > 64) throw new Error(`nonce too long (max 32 bytes): ${x}`)
    return (`0x${h.padStart(64, "0")}`) as Hex
}

function genNonce(): Hex {
    return (`0x${randomBytes(32).toString("hex")}`) as Hex
}

async function main(): Promise<Hex> {
    const args = process.argv.slice(2)
    if (args.length < 5) {
        throw new Error(
            "Usage: <privateKey0x> <toVault> <value> <tokenAddress> <chainId> [nonce] [name] [version]"
        )
    }

    const [
        privateKey,
        toVault,
        valueStr,
        tokenAddress,
        chainIdStr,
        nonceArg,
        nameArg,
        versionArg,
        blockTimestamp,
    ] = args

    const pk = normalizePk(privateKey)
    const account = privateKeyToAccount(pk)
    const from = account.address as Address
    const to = toVault as Address
    const verifyingContract = tokenAddress as Address
    const chainId = Number(chainIdStr)

    const blockTs = BigInt(blockTimestamp)
    const leeway = 60n;
    const ttl = 3600n;

    const validAfter = blockTs > leeway ? (blockTs - leeway) : 0n;
    const validBefore = blockTs + ttl;
    const value = BigInt(valueStr)

    const nonce = nonceArg ? asHexBytes32(nonceArg) : genNonce()

    const domain = {
        name: nameArg ?? "USD Coin",               // CHANGE if your token domain differs
        version: versionArg ?? "2",                // CHANGE if your token domain differs
        chainId,
        verifyingContract,
    } as const

    const types = {
        ReceiveWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
        ],
    } as const

    const signature = await account.signTypedData({
        domain,
        types,
        primaryType: "ReceiveWithAuthorization",
        message: {
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
        },
    }) // local signing, no RPC :contentReference[oaicite:3]{index=3}

    const { r, s, v, yParity } = parseSignature(signature)
    const vNorm = typeof v !== "undefined" ? v : (27n + BigInt(yParity ?? 0))

    // ABI-encode args for:
    // receiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,uint8 v,bytes32 r,bytes32 s)
    const encodedArgs = encodeAbiParameters(
        [
            { type: "address" },
            { type: "address" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint256" },
            { type: "bytes32" },
            { type: "uint8" },
            { type: "bytes32" },
            { type: "bytes32" },
        ],
        [from, to, value, validAfter, validBefore, nonce, Number(vNorm), r, s]
    ) // :contentReference[oaicite:4]{index=4}

    return encodedArgs
}

main()
    .then((hex) => {
        // IMPORTANT: no newline, so vm.ffi can hex-decode cleanly :contentReference[oaicite:5]{index=5}
        process.stdout.write(hex)
        process.exit(0)
    })
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
