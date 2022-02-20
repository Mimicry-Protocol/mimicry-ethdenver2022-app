const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("My Dapp", function () {
  let myContract;
  let owner;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  beforeEach(async () => {
    const Mimicry = await ethers.getContractFactory("Mimicry");
    owner = (await ethers.getSigners())[0];

    myContract = await Mimicry.deploy();
  });

  describe("Mimicry", function () {
    describe("getPositions", function () {
      it("Should be able to get positions", async function () {
        await myContract.mintPosition(owner.address, 1, 0, 10);

        const [res, offset] = await myContract.getPositions(owner.address, 100, 0);
        expect(res.length).to.equal(1);
        expect(res[0].bidder).to.equal(owner.address);
        expect(offset).to.equal(1);
      });

      it.only("Should liquidate correctly", async function () {
        await myContract.mintPosition(owner.address, 1, 0, 10);
        await myContract.mintPosition(owner.address, 1, 0, 10);

        await myContract.liquidatePosition(owner.address, 1);
        const [res, offset] = await myContract.getPositions(owner.address, 100, 0);
        console.log("res: ", res);
        console.log("offset: ", offset);
        expect(res.length).to.equal(1);
        // expect(res[0].bidder).to.equal(owner.address);
        // expect(offset).to.equal(2); // because second object is seen and skipped
      });


    });
  });
});
