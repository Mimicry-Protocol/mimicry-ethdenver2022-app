// pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;
//SPDX-License-Identifier: MIT

import "openzeppelin-solidity-2.3.0/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity-2.3.0/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-solidity-2.3.0/contracts/token/ERC721/ERC721Enumerable.sol";
import "./MimicryUtils.sol";

contract MimicryNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    // TODO: this should conform to NFT metadata standard
    struct NFTMetadata {
        uint256 tokenId;
        uint256 collateralAmt;
        uint256 creationTimestamp;
        uint256 deletedTimestamp;
        MimicryUtils.BetType betType;
        MimicryUtils.Collection collection;
        address bidder;
    }

    // TODO: reset this after debugging
    bool public paused = false;

    // map token id to that token's metadata
    mapping(uint256 => NFTMetadata) public tokenIdToMetadata;
    // map address to tokens they have ever owned
    mapping(address => uint256[]) public walletToNFTsOwned;

    function GetWalletToNFTsOwned(address _adr)
        public
        view
        returns (uint256[] memory)
    {
        return walletToNFTsOwned[_adr];
    }

    function GetTokenIdToMetadata(uint256 tokenId)
        public
        view
        returns (NFTMetadata memory)
    {
        return tokenIdToMetadata[tokenId];
    }

    constructor() public 
        ERC721()
    {}

    function liquidatePosition(address _bidder, uint256 _tokenId)
        public
        nonReentrant
    {
        NFTMetadata storage data = tokenIdToMetadata[_tokenId];
        require(data.creationTimestamp > 0, "Token id has not been minted");
        require(data.deletedTimestamp == 0, "Token has already been burned");
        require(
            _bidder == data.bidder,
            "Can't liquidate someone else's position"
        );

        data.deletedTimestamp = block.timestamp;
        delete tokenIdToMetadata[_tokenId];
        _burn(_tokenId);
    }

    function userMint(
        address _bidder,
        uint256 _collateralAmt,
        MimicryUtils.BetType _betType,
        MimicryUtils.Collection _collection
    ) public payable nonReentrant {
        require(!paused, "Sale paused");
        require(_collateralAmt > 0, "Collateral amount must be greater than 0");

        uint256 tokenId = totalSupply(); // the next token's tokenId == totalSupply

        NFTMetadata storage data = tokenIdToMetadata[tokenId];
        data.tokenId = tokenId;
        data.collateralAmt = _collateralAmt;
        data.creationTimestamp = block.timestamp;
        // _NB: shorting the market does not tie to a particular collection
        if (_betType == MimicryUtils.BetType.SHORT_MARKET) {
            data.collection = MimicryUtils.Collection.NONE;
        } else {
            data.collection = _collection;
        }
        data.betType = _betType;
        data.bidder = _bidder;

        tokenIdToMetadata[tokenId] = data;
        walletToNFTsOwned[_bidder].push(tokenId);

        _mint(_bidder, tokenId);
    }

    /**
     * @dev Pauses the public NFT minting.
     */
    function pause(bool val) public onlyOwner {
        paused = val;
    }
}