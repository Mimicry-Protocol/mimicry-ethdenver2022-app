pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
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
    // map address to tokens they own
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

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {}

    function liquidatePosition(address _bidder, uint256 tokenId)
        public
        nonReentrant
    {
        // TODO: use _burn API
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

        _safeMint(_bidder, tokenId);
    }

    /**
     * @dev Pauses the public NFT minting.
     */
    function pause(bool val) public onlyOwner {
        paused = val;
    }
}
