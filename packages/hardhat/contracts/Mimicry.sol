pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

contract Mimicry {

  enum BetType{ SHORT_MARKET, FOR_COLLECTION, AGAINST_COLLECTION }
  enum Collection { BUFFICORN, APES, WOMEN, DOODLES }

  constructor() payable {
    // what should we do on deploy?
  }

  function burnPosition(address _caller, address _positionNftAddress) public {
    // TODO
  }

  function mintPosition(address _caller, uint _betType, uint _collectionType, uint256 _usdcAmount) public {
    // TODO: mint NFT to caller by passing in necessary info
    BetType betType = BetType(_betType);
    Collection collectionType = Collection(_collectionType);

    if (betType == BetType.SHORT_MARKET) {
      // TODO: can ignore the collection type here
    }
  }
}
