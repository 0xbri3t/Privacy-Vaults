// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Mock MiMC hasher for testing
 * Simple keccak256 hash modulated to field size for testing purposes
 */
contract MockHasher {
    // BN254 field size
    uint256 constant FIELD_SIZE =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    function MiMCSponge(
        uint256 xL,
        uint256 xR
    ) external pure returns (uint256, uint256) {
        // Simple hash for testing - in production use real MiMC
        uint256 hash = uint256(keccak256(abi.encodePacked(xL, xR))) %
            FIELD_SIZE;
        return (hash, 0);
    }
}
