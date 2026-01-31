// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/core/PrivacyVault.sol";
import "../src/interfaces/IVerifier.sol";
import "./mocks/MockVerifier.sol";
import "./mocks/MockHasher.sol";
import "./mocks/MockUSDC.sol";

contract PrivacyVaultTest is Test {
    PrivacyVault vault;
    MockVerifier verifier;
    MockHasher hasher;
    MockUSDC usdc;

    uint256 constant FIELD_SIZE =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    uint256 user1Pk = 0xA11CE;
    uint256 user2Pk = 0xB0B;
    uint256 user3Pk = 0xCAFE;
    address user1;
    address user2;
    address user3;

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
        user1 = vm.addr(user1Pk);
        user2 = vm.addr(user2Pk);
        user3 = vm.addr(user3Pk);

        verifier = new MockVerifier();
        hasher = new MockHasher();
        usdc = new MockUSDC(0);
        vault = new PrivacyVault(
            IVerifier(address(verifier)),
            IHasher(address(hasher)),
            denomination,
            levels,
            IERC20(address(usdc))
        );

        usdc.mint(user1, initialUserBalance);
        usdc.mint(user2, initialUserBalance);
        usdc.mint(user3, initialUserBalance);
    }

    // ============ HELPERS ============

    function _signReceiveAuth(
        uint256 pk,
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce
    ) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                usdc.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(),
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );

        bytes32 domainSeparator = usdc.DOMAIN_SEPARATOR();
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        (v, r, s) = vm.sign(pk, digest);
    }

    function _depositAs(
        uint256 pk,
        address from,
        bytes32 commitment,
        bytes32 nonce
    ) internal {
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 1 hours;

        (uint8 v, bytes32 r, bytes32 s) = _signReceiveAuth(
            pk, from, address(vault), denomination, validAfter, validBefore, nonce
        );

        vault.depositWithAuthorization(
            commitment, from, validAfter, validBefore, nonce, v, r, s
        );
    }

    // ============ DEPOSIT WITH AUTHORIZATION TESTS ============

    function test_DepositWithAuth_Success() public {
        bytes32 nonce = bytes32(uint256(1));

        vm.expectEmit(true, false, false, true);
        emit Deposit(commitment1, 0, block.timestamp);
        _depositAs(user1Pk, user1, commitment1, nonce);

        assertTrue(vault.commitments(commitment1));
        assertEq(usdc.balanceOf(address(vault)), denomination);
        assertEq(usdc.balanceOf(user1), initialUserBalance - denomination);
    }

    function test_DepositWithAuth_MultipleUsers() public {
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));
        _depositAs(user2Pk, user2, commitment2, bytes32(uint256(2)));

        assertTrue(vault.commitments(commitment1));
        assertTrue(vault.commitments(commitment2));
        assertEq(usdc.balanceOf(address(vault)), denomination * 2);
    }

    function test_DepositWithAuth_RejectsDuplicateCommitment() public {
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));

        // Sign before expectRevert
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 1 hours;
        bytes32 nonce2 = bytes32(uint256(2));
        (uint8 v, bytes32 r, bytes32 s) = _signReceiveAuth(
            user2Pk, user2, address(vault), denomination, validAfter, validBefore, nonce2
        );

        vm.expectRevert(PrivacyVault.InvalidCommitment.selector);
        vault.depositWithAuthorization(
            commitment1, user2, validAfter, validBefore, nonce2, v, r, s
        );
    }

    function test_DepositWithAuth_RejectsZeroCommitment() public {
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 1 hours;
        bytes32 nonce = bytes32(uint256(99));
        (uint8 v, bytes32 r, bytes32 s) = _signReceiveAuth(
            user1Pk, user1, address(vault), denomination, validAfter, validBefore, nonce
        );

        vm.expectRevert(PrivacyVault.InvalidCommitment.selector);
        vault.depositWithAuthorization(
            bytes32(0), user1, validAfter, validBefore, nonce, v, r, s
        );
    }

    function test_DepositWithAuth_RejectsInvalidSignature() public {
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 1 hours;
        bytes32 nonce = bytes32(uint256(77));
        (uint8 v, bytes32 r, bytes32 s) = _signReceiveAuth(
            user1Pk, user1, address(vault), denomination, validAfter, validBefore, nonce
        );

        uint8 badV = v == 27 ? 28 : 27;

        vm.expectRevert();
        vault.depositWithAuthorization(
            commitment1, user1, validAfter, validBefore, nonce, badV, r, s
        );
    }

    function test_DepositWithAuth_RejectsExpiredAuth() public {
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp - 1;
        bytes32 nonce = bytes32(uint256(88));
        (uint8 v, bytes32 r, bytes32 s) = _signReceiveAuth(
            user1Pk, user1, address(vault), denomination, validAfter, validBefore, nonce
        );

        vm.expectRevert("Authorization expired");
        vault.depositWithAuthorization(
            commitment1, user1, validAfter, validBefore, nonce, v, r, s
        );
    }

    function test_DepositWithAuth_RejectsReusedNonce() public {
        bytes32 nonce = bytes32(uint256(55));
        _depositAs(user1Pk, user1, commitment1, nonce);

        // Sign before expectRevert
        uint256 validAfter = 0;
        uint256 validBefore = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signReceiveAuth(
            user1Pk, user1, address(vault), denomination, validAfter, validBefore, nonce
        );

        vm.expectRevert("Authorization already used");
        vault.depositWithAuthorization(
            commitment2, user1, validAfter, validBefore, nonce, v, r, s
        );
    }

    // ============ WITHDRAW TESTS ============

    function test_Withdraw_Success() public {
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));

        bytes32 root = vault.getLastRoot();

        uint256 balanceBefore = usdc.balanceOf(user2);
        vm.prank(user2);
        vm.expectEmit(true, false, false, true);
        emit Withdrawal(user2, nullifierHash1);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user2);

        assertTrue(vault.nullifierHashes(nullifierHash1));
        assertEq(usdc.balanceOf(user2), balanceBefore + denomination);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_Withdraw_RejectDoubleSpend() public {
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));

        bytes32 root = vault.getLastRoot();

        vm.prank(user2);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user2);

        vm.prank(user3);
        vm.expectRevert(PrivacyVault.NullifierAlreadyUsed.selector);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user3);
    }

    function test_Withdraw_RejectsInvalidRoot() public {
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));

        bytes32 invalidRoot = keccak256(abi.encodePacked("invalid"));
        vm.prank(user2);
        vm.expectRevert(PrivacyVault.InvalidRoot.selector);
        vault.withdraw(
            dummyPa, dummyPb, dummyPc, invalidRoot, nullifierHash1, user2
        );
    }

    function test_Withdraw_RejectsZeroRecipient() public {
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));

        bytes32 root = vault.getLastRoot();

        vm.prank(user2);
        vm.expectRevert(PrivacyVault.InvalidCommitment.selector);
        vault.withdraw(
            dummyPa, dummyPb, dummyPc, root, nullifierHash1, address(0)
        );
    }

    function test_Withdraw_MultipleDepositsMultipleWithdraws() public {
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));
        _depositAs(user2Pk, user2, commitment2, bytes32(uint256(2)));

        bytes32 root = vault.getLastRoot();

        uint256 user3BalanceBefore = usdc.balanceOf(user3);
        vm.prank(user3);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user3);

        assertEq(usdc.balanceOf(user3), user3BalanceBefore + denomination);
        assertEq(usdc.balanceOf(address(vault)), denomination);

        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash2, user1);

        assertEq(usdc.balanceOf(user1), user1BalanceBefore + denomination);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_Security_MultipleWithdraws() public {
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));
        _depositAs(user2Pk, user2, commitment2, bytes32(uint256(2)));

        bytes32 root = vault.getLastRoot();

        vm.prank(user1);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash1, user1);

        vm.prank(user2);
        vault.withdraw(dummyPa, dummyPb, dummyPc, root, nullifierHash2, user2);

        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    // ============ HELPER TESTS ============

    function test_VaultInitialization() public view {
        assertEq(vault.denomination(), denomination);
        assertEq(address(vault.token()), address(usdc));
        assertEq(address(vault.verifier()), address(verifier));
    }

    function test_RootTracking() public {
        assertTrue(vault.isKnownRoot(vault.getLastRoot()));

        bytes32 rootBefore = vault.getLastRoot();
        _depositAs(user1Pk, user1, commitment1, bytes32(uint256(1)));
        bytes32 rootAfter = vault.getLastRoot();

        assertTrue(vault.isKnownRoot(rootBefore));
        assertTrue(vault.isKnownRoot(rootAfter));
    }
}
