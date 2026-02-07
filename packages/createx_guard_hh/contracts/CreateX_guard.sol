// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.33;

/**
 * @title CreateX Factory Smart Contract
 * @author pcaversaccio (https://web.archive.org/web/20230921103111/https://pcaversaccio.com/)
 * @custom:coauthor Matt Solomon (https://web.archive.org/web/20230921103335/https://mattsolomon.dev/)
 * @notice Factory smart contract to make easier and safer usage of the
 * `CREATE` (https://web.archive.org/web/20230921103540/https://www.evm.codes/#f0?fork=shanghai) and `CREATE2`
 * (https://web.archive.org/web/20230921103540/https://www.evm.codes/#f5?fork=shanghai) EVM opcodes as well as of
 * `CREATE3`-based (https://web.archive.org/web/20230921103920/https://github.com/ethereum/EIPs/pull/3171) contract creations.
 * @dev To simplify testing of non-public variables and functions, we use the `internal`
 * function visibility specifier `internal` for all variables and functions, even though
 * they could technically be `private` since we do not expect anyone to inherit from
 * the `CreateX` contract.
 * @custom:security-contact See https://web.archive.org/web/20230921105029/https://raw.githubusercontent.com/pcaversaccio/createx/main/SECURITY.md.
 */
/// @title CreateX Guard Contract
/// @author lime <liumingxun@yeah.net> 
/// @notice This file is derived from the original AGPL-3.0-only licensed work.
/// @dev For testing purposes only, the implementation has been minimally reduced
///      to the parts necessary for the intended tests. No functional changes
///      beyond test scope simplification were made.
///      - Last modified: 2026-02-07
contract CreateX_guard {
    /**
     * @dev Enum for the selection of a permissioned deploy protection.
     */
    enum SenderBytes {
        MsgSender,
        ZeroAddress,
        Random
    }

    /**
     * @dev Enum for the selection of a cross-chain redeploy protection.
     */
    enum RedeployProtectionFlag {
        True,
        False,
        Unspecified
    }

    function _parseSalt(bytes32 salt)
        internal
        view
        returns (SenderBytes senderBytes, RedeployProtectionFlag redeployProtectionFlag)
    {
        if (address(bytes20(salt)) == msg.sender && bytes1(salt[20]) == hex"01") {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.MsgSender, RedeployProtectionFlag.True);
        } else if (address(bytes20(salt)) == msg.sender && bytes1(salt[20]) == hex"00") {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.MsgSender, RedeployProtectionFlag.False);
        } else if (address(bytes20(salt)) == msg.sender) {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.MsgSender, RedeployProtectionFlag.Unspecified);
        } else if (address(bytes20(salt)) == address(0) && bytes1(salt[20]) == hex"01") {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.ZeroAddress, RedeployProtectionFlag.True);
        } else if (address(bytes20(salt)) == address(0) && bytes1(salt[20]) == hex"00") {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.ZeroAddress, RedeployProtectionFlag.False);
        } else if (address(bytes20(salt)) == address(0)) {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.ZeroAddress, RedeployProtectionFlag.Unspecified);
        } else if (bytes1(salt[20]) == hex"01") {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.Random, RedeployProtectionFlag.True);
        } else if (bytes1(salt[20]) == hex"00") {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.Random, RedeployProtectionFlag.False);
        } else {
            (senderBytes, redeployProtectionFlag) = (SenderBytes.Random, RedeployProtectionFlag.Unspecified);
        }
    }

    function _guard(bytes32 salt) public view returns (bytes32 guardedSalt) {
        (SenderBytes senderBytes, RedeployProtectionFlag redeployProtectionFlag) = _parseSalt({salt: salt});

        if (senderBytes == SenderBytes.MsgSender && redeployProtectionFlag == RedeployProtectionFlag.True) {
            // Configures a permissioned deploy protection as well as a cross-chain redeploy protection.
            guardedSalt = keccak256(abi.encode(msg.sender, block.chainid, salt));
        } else if (senderBytes == SenderBytes.MsgSender && redeployProtectionFlag == RedeployProtectionFlag.False) {
            // Configures solely a permissioned deploy protection.
            guardedSalt = _efficientHash({a: bytes32(uint256(uint160(msg.sender))), b: salt});
        } else if (senderBytes == SenderBytes.MsgSender) {
            // Reverts if the 21st byte is greater than `0x01` in order to enforce developer explicitness.
            revert('invalid salt');
        } else if (senderBytes == SenderBytes.ZeroAddress && redeployProtectionFlag == RedeployProtectionFlag.True) {
            // Configures solely a cross-chain redeploy protection. In order to prevent a pseudo-randomly
            // generated cross-chain redeploy protection, we enforce the zero address check for the first 20 bytes.
            guardedSalt = _efficientHash({a: bytes32(block.chainid), b: salt});
        } else if (
            senderBytes == SenderBytes.ZeroAddress && redeployProtectionFlag == RedeployProtectionFlag.Unspecified
        ) {
            // Reverts if the 21st byte is greater than `0x01` in order to enforce developer explicitness.
            revert('invalid salt');
        } else {
            // For the non-pseudo-random cases, the salt value `salt` is hashed to prevent the safeguard mechanisms
            // from being bypassed. Otherwise, the salt value `salt` is not modified.
            guardedSalt = keccak256(abi.encode(salt));
        }
    }

    function _efficientHash(bytes32 a, bytes32 b) internal pure returns (bytes32 hash) {
        assembly ("memory-safe") {
            mstore(0x00, a)
            mstore(0x20, b)
            hash := keccak256(0x00, 0x40)
        }
    }
}
