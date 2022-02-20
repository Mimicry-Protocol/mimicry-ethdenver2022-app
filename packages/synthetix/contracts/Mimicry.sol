pragma solidity ^0.5.16;
//SPDX-License-Identifier: MIT

// import "./MimicryNFT.sol";
import "./MimicryUtils.sol";

import "./Synthetix.sol";
import "./FeePool.sol";
import "./Exchanger.sol";
import "./AddressResolver.sol";
import "./MultiCollateralSynth.sol";

contract Mimicry {
    // MimicryNFT private nft;
    Synthetix private synthetix;
    FeePool private feePool;
    Exchanger private exchanger;
    AddressResolver private resolver;
    MultiCollateralSynth private mcs;

    constructor() public {
        // nft = new MimicryNFT("Mimicry", "MIME");
        resolver = new AddressResolver(address(this));
        synthetix = Synthetix(resolver.getAddress("Synthetix"));
        feePool = FeePool(resolver.getAddress("FeePool"));
        exchanger = Exchanger(resolver.getAddress("Exchanger"));
        mcs = MultiCollateralSynth(resolver.getAddress("MultiCollateralSynth"));
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

        // mcs.issue(_bidder, _usdcAmount);

        // mint nft to caller
        // nft.userMint(_bidder, _usdcAmount, betType, collectionType);
    }

    function liquidatePosition(address _bidder, uint256 tokenId) public {
        // TODO: get the amount represented by the tokenId
        // then pass the amount as the second argument to this function
        uint256 amount = 1;
        // mcs.burn(_bidder, amount);
    }

    // function getPositions(
    //     address _caller,
    //     uint256 limit,
    //     uint256 offset
    // ) public view returns (MimicryNFT.NFTMetadata[] memory, uint256) {
    //     uint256[] memory tokenIds = nft.GetWalletToNFTsOwned(_caller);

    //     uint256 tokensInCurrentPageCount = 0;
    //     MimicryNFT.NFTMetadata[]
    //         memory metadatas = new MimicryNFT.NFTMetadata[](limit);

    //     while (
    //         tokensInCurrentPageCount < limit &&
    //         offset + tokensInCurrentPageCount < tokenIds.length
    //     ) {
    //         uint256 currentTokenId = tokenIds[
    //             offset + tokensInCurrentPageCount
    //         ];
    //         MimicryNFT.NFTMetadata memory data = nft.GetTokenIdToMetadata(
    //             currentTokenId
    //         );
    //         if (data.deletedTimestamp == 0) {
    //             metadatas[tokensInCurrentPageCount] = data;
    //             tokensInCurrentPageCount++;
    //         }
    //     }

    //     // don't return empty space at the end of the array because it confuses the FE
    //     MimicryNFT.NFTMetadata[]
    //         memory metadatasToReturn = new MimicryNFT.NFTMetadata[](
    //             tokensInCurrentPageCount
    //         );
    //     for (uint256 i = 0; i < tokensInCurrentPageCount; i++) {
    //         metadatasToReturn[i] = metadatas[i];
    //     }

    //     return (metadatasToReturn, offset);
    // }

    // function liquidatePosition(address _bidder, uint256 tokenId) public {
    //     nft.liquidatePosition(_bidder, tokenId);

    //     // TODO: return collateral to _bidder's wallet
    // }
}
