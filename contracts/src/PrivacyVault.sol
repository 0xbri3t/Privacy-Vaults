// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {IVerifier} from "./Verifier.sol";
import {IncrementalMerkleTree, Poseidon2} from "./IncrementalMerkleTree.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PrivacyVault is IncrementalMerkleTree, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // keccak256("receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)")[0:4]
    bytes4 private constant _RECEIVE_WITH_AUTHORIZATION_SELECTOR = 0xef55bec6;

    IERC20 public immutable token; // the USDC token contract (future work: make it generic to support any ERC20)

    IVerifier public immutable i_verifier; // Noir generated i_verifier contract
    uint256 public immutable DENOMINATION; // the fixed amount of USDC that needs to be sent of the PrivacyVault contract

    mapping(bytes32 => bool) public s_nullifierHashes; // used nullifiers to prevent double spending
    mapping(bytes32 => bool) public s_commitments; // we store all commitments just to prevent accidental deposits with the same commitment

    event DepositWithAuthorization(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address to, bytes32 nullifierHash);

    error PrivacyVault__DepositValueMismatch(uint256 expected, uint256 actual);
    error PrivacyVault__PaymentFailed(address recipient, uint256 amount);
    error PrivacyVault__NoteAlreadySpent(bytes32 nullifierHash);
    error PrivacyVault__UnknownRoot(bytes32 root);
    error PrivacyVault__InvalidWithdrawProof();
    error PrivacyVault__FeeExceedsDepositValue(uint256 expected, uint256 actual);
    error PrivacyVault__CommitmentAlreadyAdded(bytes32 commitment);

    /**
     * @dev The constructor
     * @param _verifier the address of SNARK verifier for this contract
     * @param _hasher the address of MiMC hash contract
     * @param _merkleTreeDepth the depth of deposits' Merkle Tree
     */

    constructor(IVerifier _verifier, Poseidon2 _hasher, uint32 _merkleTreeDepth, uint256 _denomination, IERC20 _token)
        IncrementalMerkleTree(_merkleTreeDepth, _hasher)
    {
        i_verifier = _verifier;
        DENOMINATION = _denomination;
        token = _token;
    }

    /**
     * @param _commitment the note commitment, which is Poseidon(nullifier + secret)
     * @param _receiveAuthorization the calldata for EIP-3009 receiveWithAuthorization function
     */
    function depositWithAuthorization(bytes32 _commitment, bytes calldata _receiveAuthorization)
        external
        payable
        nonReentrant
    {
        // check if the commitment is already added
        if (s_commitments[_commitment]) revert PrivacyVault__CommitmentAlreadyAdded(_commitment);

        // add the commitment to the added commitments mapping
        s_commitments[_commitment] = true;

        // decode the receiveAuthorization to extract the amount and to address
        (address from, address to, uint256 amount) =
            abi.decode(_receiveAuthorization[0:96], (address, address, uint256));

        if (amount != DENOMINATION) {
            revert PrivacyVault__DepositValueMismatch({expected: DENOMINATION, actual: amount});
        }
        if (to != address(this)) revert PrivacyVault__DepositValueMismatch({expected: DENOMINATION, actual: amount});

        // call the token contract to transfer USDC from the depositor to the PrivacyVault contract
        (bool success,) =
            address(token).call(abi.encodePacked(_RECEIVE_WITH_AUTHORIZATION_SELECTOR, _receiveAuthorization));
        if (!success) revert PrivacyVault__PaymentFailed({recipient: address(this), amount: amount});

        // insert the commitment into the Merkle tree
        uint32 insertedIndex = _insert(_commitment);

        emit DepositWithAuthorization(_commitment, insertedIndex, block.timestamp);
    }

    function withdraw(bytes calldata _proof, bytes32 _root, bytes32 _nullifierHash, address payable _recipient)
        external
        nonReentrant
    {
        // check if the nullifier is already used
        if (s_nullifierHashes[_nullifierHash]) revert PrivacyVault__NoteAlreadySpent({nullifierHash: _nullifierHash});

        // check if the root is a valid root
        if (!isKnownRoot(_root)) revert PrivacyVault__UnknownRoot({root: _root});

        bytes32[] memory publicInputs = new bytes32[](3);
        publicInputs[0] = _root; // the root of the Merkle tree
        publicInputs[1] = _nullifierHash; // the nullifier hash
        publicInputs[2] = bytes32(uint256(uint160(address(_recipient)))); // the recipient address

        // verify the proof - check the Merkle proof against the root, the ZK proof to check the commitments match, they know a valid nullifier hash and secret, a valid root and the recipient hasn't been modified
        if (!i_verifier.verify(_proof, publicInputs)) revert PrivacyVault__InvalidWithdrawProof();

        s_nullifierHashes[_nullifierHash] = true; // mark the nullifier as used before sending the funds

        // transfer the funds to the recipient
        token.safeTransfer(_recipient, DENOMINATION);

        emit Withdrawal(_recipient, _nullifierHash);
    }
}
