    /**
     * @dev Implements different safeguarding mechanisms depending on the encoded values in the salt
     * (`||` stands for byte-wise concatenation):
     *   => salt (32 bytes) = 0xbebebebebebebebebebebebebebebebebebebebe||ff||1212121212121212121212
     *   - The first 20 bytes (i.e. `bebebebebebebebebebebebebebebebebebebebe`) may be used to
     *     implement a permissioned deploy protection by setting them equal to `msg.sender`,
     *   - The 21st byte (i.e. `ff`) may be used to implement a cross-chain redeploy protection by
     *     setting it equal to `0x01`,
     *   - The last random 11 bytes (i.e. `1212121212121212121212`) allow for 2**88 bits of entropy
     *     for mining a salt.
     * @param salt The 32-byte random value used to create the contract address.
     * @return guardedSalt The guarded 32-byte random value used to create the contract address.
     */
    function _guard(bytes32 salt) internal view returns (bytes32 guardedSalt) {
        (SenderBytes senderBytes, RedeployProtectionFlag redeployProtectionFlag) = _parseSalt({salt: salt});


        if (senderBytes == SenderBytes.MsgSender && redeployProtectionFlag == RedeployProtectionFlag.True) {
            // Configures a permissioned deploy protection as well as a cross-chain redeploy protection.
            guardedSalt = keccak256(abi.encode(msg.sender, block.chainid, salt));
        } else if (senderBytes == SenderBytes.MsgSender && redeployProtectionFlag == RedeployProtectionFlag.False) {
            // Configures solely a permissioned deploy protection.
            guardedSalt = _efficientHash({a: bytes32(uint256(uint160(msg.sender))), b: salt});
        } else if (senderBytes == SenderBytes.MsgSender) {
            // Reverts if the 21st byte is greater than `0x01` in order to enforce developer explicitness.
            revert InvalidSalt({emitter: _SELF});
        } else if (senderBytes == SenderBytes.ZeroAddress && redeployProtectionFlag == RedeployProtectionFlag.True) {
            // Configures solely a cross-chain redeploy protection. In order to prevent a pseudo-randomly
            // generated cross-chain redeploy protection, we enforce the zero address check for the first 20 bytes.
            guardedSalt = _efficientHash({a: bytes32(block.chainid), b: salt});
        } else if (
            senderBytes == SenderBytes.ZeroAddress && redeployProtectionFlag == RedeployProtectionFlag.Unspecified
        ) {
            // Reverts if the 21st byte is greater than `0x01` in order to enforce developer explicitness.
            revert InvalidSalt({emitter: _SELF});
        } else {
            // For the non-pseudo-random cases, the salt value `salt` is hashed to prevent the safeguard mechanisms
            // from being bypassed. Otherwise, the salt value `salt` is not modified.
            guardedSalt = (salt != _generateSalt()) ? keccak256(abi.encode(salt)) : salt;
        }
    }
