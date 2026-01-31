// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/core/PrivacyVault.sol";
import "../src/interfaces/IVerifier.sol";
import "./mocks/MockVerifier.sol";
import "./mocks/MockHasher.sol";
import "./mocks/TestToken.sol";

contract PrivacyVaultTest is Test {
    PrivacyVault vault;
    MockVerifier verifier;
    MockHasher hasher;
    TestToken token;

    // BN254 field size
    uint256 constant FIELD_SIZE =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    address user1 = address(0x1);
    address user2 = address(0x2);
    address user3 = address(0x3);

    uint256 initialUserBalance = 500e18;

    uint256 denomination = 100e18; // 100 tokens
    uint32 levels = 20;

    bytes32 commitment1 = bytes32(uint256(123456789));
    bytes32 commitment2 = bytes32(uint256(987654321));
    bytes32 nullifierHash1 = bytes32(uint256(111111111));
    bytes32 nullifierHash2 = bytes32(uint256(222222222));

    // Dummy proof components
    uint[2] dummyPa = [uint(1), uint(2)];
    uint[2][2] dummyPb = [[uint(1), uint(2)], [uint(3), uint(4)]];
    uint[2] dummyPc = [uint(5), uint(6)];

    event Deposit(
        bytes32 indexed commitment,
        uint32 leafIndex,
        uint256 timestamp
    );
    event Withdrawal(address indexed to, bytes32 nullifierHash);

    function setUp() public {
        // Deploy test contracts
        verifier = new MockVerifier();
        hasher = new MockHasher();
        token = new TestToken(3000e18); 
        vault = new PrivacyVault(
            IVerifier(address(verifier)),
            IHasher(address(hasher)),
            denomination,
            levels,
            IERC20(address(token))
        );

        // Give users tokens and approve vault
        token.mint(user1, initialUserBalance);
        token.mint(user2, initialUserBalance);
        token.mint(user3, initialUserBalance);

        vm.prank(user1);
        token.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        token.approve(address(vault), type(uint256).max);
        vm.prank(user3);
        token.approve(address(vault), type(uint256).max);
    }

    // ============ DEPOSIT TESTS ============

    function test_Deposit_Success() public {
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit Deposit(commitment1, 0, block.timestamp);
        vault.deposit(commitment1);

        // Verify commitment was recorded
        assertTrue(vault.commitments(commitment1));

        // Verify tokens were transferred
        assertEq(token.balanceOf(address(vault)), denomination);
        assertEq(token.balanceOf(user1), initialUserBalance - denomination);
    }

    function test_Deposit_MultipleUsers() public {
        // User1 deposits
        vm.prank(user1);
        vault.deposit(commitment1);

        // User2 deposits
        vm.prank(user2);
        vault.deposit(commitment2);

        // Both commitments should be recorded
        assertTrue(vault.commitments(commitment1));
        assertTrue(vault.commitments(commitment2));

        // Vault should have 2x denomination
        assertEq(token.balanceOf(address(vault)), denomination * 2);
    }

    function test_Deposit_RejectsDuplicateCommitment() public {
        vm.prank(user1);
        vault.deposit(commitment1);

        // Try to deposit same commitment again (from any user)
        vm.prank(user2);
        vm.expectRevert(PrivacyVault.InvalidCommitment.selector);
        vault.deposit(commitment1);
    }

    function test_Deposit_RejectsZeroCommitment() public {
        vm.prank(user1);
        vm.expectRevert(PrivacyVault.InvalidCommitment.selector);
        vault.deposit(bytes32(0));
    }

    function test_Deposit_RejectsInsufficientApproval() public {
        // User without approval
        address userNoApproval = address(0x4);
        token.mint(userNoApproval, initialUserBalance);

        vm.prank(userNoApproval);
        vm.expectRevert();
        vault.deposit(commitment1);
    }

    // ============ WITHDRAW TESTS ============

    function test_Withdraw_Success() public {
        // User deposits with commitment
        vm.prank(user1);
        vault.deposit(commitment1);

        // Get the merkle root from vault
        bytes32 root = vault.getLastRoot();

        // Anyone who knows the note can withdraw with valid proof and valid root
        // (In real scenario, proof would prove knowledge of the note)
        uint256 balanceBefore = token.balanceOf(user2);
        vm.prank(user2); // Different user withdrawing
        vm.expectEmit(true, false, false, true);
        emit Withdrawal(user2, nullifierHash1);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user2);

        // Verify nullifier is marked as used
        assertTrue(vault.nullifierHashes(nullifierHash1));

        // Verify funds were transferred to user2 (not user1 who deposited)
        assertEq(token.balanceOf(user2), balanceBefore + denomination);
        assertEq(token.balanceOf(address(vault)), 0);
    }

    function test_Withdraw_RejectDoubleSpend() public {
        // User deposits
        vm.prank(user1);
        vault.deposit(commitment1);

        bytes32 root = vault.getLastRoot();

        // First withdrawal succeeds
        vm.prank(user2);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user2);

        // Second withdrawal with same nullifier fails (double-spend prevention)
        vm.prank(user3);
        vm.expectRevert(PrivacyVault.NullifierAlreadyUsed.selector);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user3);
    }

    function test_Withdraw_RejectsInvalidRoot() public {
        // User deposits
        vm.prank(user1);
        vault.deposit(commitment1);

        // Try to withdraw with invalid root
        bytes32 invalidRoot = keccak256(abi.encodePacked("invalid"));
        vm.prank(user2);
        vm.expectRevert(PrivacyVault.InvalidRoot.selector);
        vault.withdraw(
            dummyPa,
            dummyPb,
            dummyPc,
            invalidRoot,
            nullifierHash1,
            user2
        );
    }

    function test_Withdraw_RejectsZeroRecipient() public {
        // User deposits
        vm.prank(user1);
        vault.deposit(commitment1);

        bytes32 root = vault.getLastRoot();

        // Try to withdraw to zero address
        vm.prank(user2);
        vm.expectRevert(PrivacyVault.InvalidCommitment.selector);
        vault.withdraw(
            dummyPa,
            dummyPb,
            dummyPc,
            root,
            nullifierHash1,
            address(0)
        );
    }

    function test_Withdraw_MultipleDepositsMultipleWithdraws() public {
        // Multiple users deposit
        vm.prank(user1);
        vault.deposit(commitment1);

        vm.prank(user2);
        vault.deposit(commitment2);

        bytes32 root = vault.getLastRoot();

        // Anyone can withdraw as long as they know a valid note and nullifier
        uint256 user3BalanceBefore = token.balanceOf(user3);
        vm.prank(user3);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user3);

        assertEq(token.balanceOf(user3), user3BalanceBefore + denomination);
        assertEq(token.balanceOf(address(vault)), denomination);

        // User1 can also withdraw with a different nullifier
        uint256 user1BalanceBefore = token.balanceOf(user1);
        vm.prank(user1);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash2, user1);

        assertEq(token.balanceOf(user1), user1BalanceBefore + denomination);
        assertEq(token.balanceOf(address(vault)), 0);
    }


    function test_Security_MultipleWithdraws() public {
        // Multiple notes can be withdrawn independently
        vm.prank(user1);
        vault.deposit(commitment1);

        vm.prank(user2);
        vault.deposit(commitment2);

        bytes32 root = vault.getLastRoot();

        // Withdraw with first nullifier
        vm.prank(user1);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user1);

        // Can still withdraw with second nullifier (different note)
        vm.prank(user2);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash2, user2);

        assertEq(token.balanceOf(address(vault)), 0);
    }

    // ============ HELPER TESTS ============

    function test_VaultInitialization() public view {
        assertEq(vault.denomination(), denomination);
        assertEq(address(vault.token()), address(token));
        assertEq(address(vault.verifier()), address(verifier));
    }

    function test_RootTracking() public {
        // First root should exist (initial state)
        assertTrue(vault.isKnownRoot(vault.getLastRoot()));

        // After deposit, root should change
        bytes32 rootBefore = vault.getLastRoot();
        vm.prank(user1);
        vault.deposit(commitment1);
        bytes32 rootAfter = vault.getLastRoot();

        // Both should be valid
        assertTrue(vault.isKnownRoot(rootBefore));
        assertTrue(vault.isKnownRoot(rootAfter));
    }
}
