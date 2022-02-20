//SPDX-License-Identifier: MIT
pragma solidity ^0.5.4;
pragma experimental ABIEncoderV2;

import "./MimicryNFT.sol";
import "./MimicryUtils.sol";

contract Mimicry {
    MimicryNFT private nft;

    constructor() public {
        nft = new MimicryNFT();
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

    function getPositions(
        address _caller
    ) public view returns (MimicryNFT.NFTMetadata[] memory, uint256) {

        uint256[] memory tokenIds = nft.GetWalletToNFTsOwned(_caller);
        MimicryNFT.NFTMetadata[]
        memory metadatasToReturn = new MimicryNFT.NFTMetadata[](
            tokenIds.length);
        for (uint i = 0; i < tokenIds.length; i++) {
            MimicryNFT.NFTMetadata memory data = nft.GetTokenIdToMetadata(tokenIds[i]);
            if (data.creationTimestamp > 0) {
                metadatasToReturn[i] = data;
            }
        }
        return (metadatasToReturn, tokenIds.length);
    }

    function liquidatePosition(address _bidder, uint256 tokenId) public {
        nft.liquidatePosition(_bidder, tokenId);

        // TODO: return collateral to _bidder's wallet
    }
}
