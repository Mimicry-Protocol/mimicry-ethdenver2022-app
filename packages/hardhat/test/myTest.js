const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("My Dapp", function () {
  let myContract;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  describe("Mimicry", function () {
    it("Should deploy Mimicry", async function () {
      const Mimicry = await ethers.getContractFactory("Mimicry");

      myContract = await Mimicry.deploy();
    });

    describe("setBetType()", function () {
      it("Should be able to set a new purpose", async function () {
        const newPurpose = "Test Purpose";

        await myContract.setBetType(newPurpose);
        expect(await myContract.purpose()).to.equal(newPurpose);
      });

      // Uncomment the event and emit lines in Mimicry.sol to make this test pass

      /*it("Should emit a SetPurpose event ", async function () {
        const [owner] = await ethers.getSigners();

        const newPurpose = "Another Test Purpose";

        expect(await myContract.setBetType(newPurpose)).to.
          emit(myContract, "SetPurpose").
            withArgs(owner.address, newPurpose);
      });*/
    });
  });
});
