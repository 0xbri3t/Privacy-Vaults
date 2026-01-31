// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../MerkleTreeWithHistory.sol";
import "../interfaces/IVerifier.sol";

contract PrivacyVault is MerkleTreeWithHistory, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    /// @notice ZK-SNARK verifier contract
    IVerifier public immutable verifier;

    /// @notice Fixed denomination for this vault (e.g., 100 USDC)
    uint256 public immutable denomination;

    /// @notice Track spent nullifiers to prevent double-spends
    mapping(bytes32 => bool) public nullifierHashes;

    /// @notice Track valid commitments (for quick lookup)
    mapping(bytes32 => bool) public commitments;

    event Deposit(
        bytes32 indexed commitment,
        uint32 leafIndex,
        uint256 timestamp
    );
    event Withdrawal(address indexed to, bytes32 nullifierHash);

    error InvalidCommitment();
    error NullifierAlreadyUsed();
    error InvalidRoot();
    error InvalidWithdrawalProof();

    /**
     * @param _verifier ZK-SNARK verifier contract
     * @param _hasher MiMC hasher contract
     * @param _denomination Fixed deposit/withdrawal amount
     * @param _levels Merkle tree height
     * @param _token ERC20 token contract
     */
    constructor(
        IVerifier _verifier,
        IHasher _hasher,
        uint256 _denomination,
        uint32 _levels,
        IERC20 _token
    ) MerkleTreeWithHistory(_levels, _hasher) {
        require(_denomination > 0, "Denomination must be greater than 0");
        verifier = _verifier;
        denomination = _denomination;
        token = _token;
    }

    /**
     * @notice Deposit funds into the vault
     * @dev Creates a new leaf in the Merkle tree with the commitment hash
     * @param _commitment The secret commitment hash
     */
    function deposit(bytes32 _commitment) external nonReentrant {
        if (_commitment == bytes32(0)) revert InvalidCommitment();
        if (commitments[_commitment]) revert InvalidCommitment();

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;

        token.safeTransferFrom(msg.sender, address(this), denomination);

        emit Deposit(_commitment, insertedIndex, block.timestamp);
    }

    /**
     * @notice Deposit funds using EIP-3009 TransferWithAuthorization (gasless)
     * @dev Verifies EIP-3009 signature and executes transfer atomically
     * @param _commitment The secret commitment hash
     * @param _from The account to transfer from
     * @param _validAfter The unix time after which the transfer is valid
     * @param _validBefore The unix time before which the transfer is valid
     * @param _nonce The unique nonce for this authorization
     * @param _v ECDSA signature component v
     * @param _r ECDSA signature component r
     * @param _s ECDSA signature component s
     */
    function depositWithAuthorization(
        bytes32 _commitment,
        address _from,
        uint256 _validAfter,
        uint256 _validBefore,
        bytes32 _nonce,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external nonReentrant {
        if (_commitment == bytes32(0)) revert InvalidCommitment();
        if (commitments[_commitment]) revert InvalidCommitment();

        // Call permit to authorize transfer (handles EIP-3009 signature verification)
        IERC20Permit(address(token)).permit(
            _from,
            address(this),
            denomination,
            _validBefore,
            _v,
            _r,
            _s
        );

        uint32 insertedIndex = _insert(_commitment);
        commitments[_commitment] = true;

        // Transfer the tokens from the user
        token.safeTransferFrom(_from, address(this), denomination);

        emit Deposit(_commitment, insertedIndex, block.timestamp);
    }

    /**
     * @notice Withdraw funds from the vault using ZK proof
     * @dev Verifies Groth16 proof before allowing withdrawal
     * @param _pA Proof point A [x, y]
     * @param _pB Proof point B [[x1, x2], [y1, y2]]
     * @param _pC Proof point C [x, y]
     * @param _root Merkle root (must be in root history)
     * @param _nullifierHash Hash of nullifier (prevents double-spend)
     * @param _recipient Address to receive funds
     */
    function withdraw(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        bytes32 _root,
        bytes32 _nullifierHash,
        address _recipient
    ) external nonReentrant {
        // Validate inputs
        if (_recipient == address(0)) revert InvalidCommitment();
        if (nullifierHashes[_nullifierHash]) revert NullifierAlreadyUsed();
        if (!isKnownRoot(_root)) revert InvalidRoot();

        // Verify ZK proof
        uint[] memory pubSignals = new uint[](0); // Empty public signals array for this circuit
        if (!verifier.verifyProof(_pA, _pB, _pC, pubSignals)) {
            revert InvalidWithdrawalProof();
        }

        // Mark nullifier as spent
        nullifierHashes[_nullifierHash] = true;

        // Transfer funds to recipient
        token.safeTransfer(_recipient, denomination);

        emit Withdrawal(_recipient, _nullifierHash);
    }
}
