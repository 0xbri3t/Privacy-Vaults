// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/IVerifier.sol";

/**
 * @notice Mock verifier for testing purposes
 * Always returns true to allow testing vault logic without generating real proofs
 */
contract MockVerifier is IVerifier {
    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata,
        uint[2] calldata,
        uint[] calldata
    ) external pure returns (bool) {
        return true;
    }
}
