// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Interface for MiMC hasher used in ZK circuits
 */
interface IHasher {
    /**
     * @notice Compute MiMC hash of two inputs
     * @param xL Left input
     * @param xR Right input
     * @return Hash result
     */
    function hash(uint256 xL, uint256 xR) external pure returns (uint256);
}
