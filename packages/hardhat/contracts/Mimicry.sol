pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "./MimicryNFT.sol";
import "./MimicryUtils.sol";

contract Mimicry {
    MimicryNFT private nft;

    constructor() {
        nft = new MimicryNFT("Mimicry", "MIME");
    }

    function burnPosition(address _caller, address _positionNftAddress) public {
        // TODO
    }

    function mintPosition(
        address _bidder,
        uint256 _betType,
        uint256 _collectionType,
        uint256 _usdcAmount
    ) public {
        // TODO: require that bidder's wallet has USDC >= collateral amount
        // TODO: send USDC from _bidder to contract address

        MimicryUtils.BetType betType = MimicryUtils.BetType(_betType);
        MimicryUtils.Collection collectionType = MimicryUtils.Collection(
            _collectionType
        );

        // mint nft to caller
        nft.userMint(_bidder, _usdcAmount, betType, collectionType);
    }
}
