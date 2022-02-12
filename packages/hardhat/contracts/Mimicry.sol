pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

contract Mimicry {

  enum BetType{ SHORT_MARKET, FOR_COLLECTION, AGAINST_COLLECTION }

  constructor() payable {
    // what should we do on deploy?
  }

  function mintPosition(address _caller, uint _betType, string memory _collectionSlug, uint256 _usdcAmount) public {
    // TODO: mint NFT to caller by passing in necessary info
    BetType betType = BetType(_betType);
  }
}
