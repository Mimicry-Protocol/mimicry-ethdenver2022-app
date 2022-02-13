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

    function getPositions(
        address _caller,
        uint256 limit,
        uint256 offset
    ) public view returns (MimicryNFT.NFTMetadata[] memory, uint256) {
        uint256[] memory tokenIds = nft.GetWalletToNFTsOwned(_caller);

        uint256[] memory tokenIdsCurrentPage = new uint256[](limit);
        uint256 tokensInCurrentPageCount = 0;

        // get current page of token ids
        while (
            tokensInCurrentPageCount < limit &&
            offset + tokensInCurrentPageCount < tokenIds.length
        ) {
            tokenIdsCurrentPage[tokensInCurrentPageCount] = tokenIds[
                offset + tokensInCurrentPageCount
            ];
            tokensInCurrentPageCount++;
        }

        // get metadata object for current page of NFTs
        MimicryNFT.NFTMetadata[]
            memory metadatas = new MimicryNFT.NFTMetadata[](
                tokensInCurrentPageCount
            );
        for (uint256 i = 0; i < tokensInCurrentPageCount; i++) {
            metadatas[i] = nft.GetTokenIdToMetadata(tokenIdsCurrentPage[i]);
            offset++;
        }

        return (metadatas, offset);
    }
}
