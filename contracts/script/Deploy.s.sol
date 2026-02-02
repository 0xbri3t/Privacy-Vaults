// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import {PrivacyVault, IVerifier, Poseidon2} from "../src/PrivacyVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Deploy is Script {
    function run() external {
        address usdc = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // USDC on Base Sepolia

        vm.startBroadcast();

        Poseidon2 poseidon = new Poseidon2();
        HonkVerifier verifier = new HonkVerifier();
        PrivacyVault vault = new PrivacyVault(
            IVerifier(verifier),
            poseidon,
            20,       // merkle tree depth
            1e6,      // 1 USDC (6 decimals)
            IERC20(usdc)
        );

        vm.stopBroadcast();

        console.log("Poseidon2:", address(poseidon));
        console.log("HonkVerifier:", address(verifier));
        console.log("PrivacyVault:", address(vault));
    }
}
