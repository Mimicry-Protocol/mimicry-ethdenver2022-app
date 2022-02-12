pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

contract Mimicry {

  enum BetType{ SHORT_MARKET, FOR_COLLECTION, AGAINST_COLLECTION }

  constructor() payable {
    // what should we do on deploy?
  }

  function setBetType(address _caller, uint _betType) public {
      BetType tmp = BetType(_betType);
  }
}
