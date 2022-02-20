'use strict';

const { artifacts, contract, web3 } = require('hardhat');

const { assert, addSnapshotBeforeRestoreAfterEach } = require('./common');

let Mimicry;

const {
	onlyGivenAddressCanInvoke,
	ensureOnlyExpectedMutativeFunctions,
	setupPriceAggregators,
	updateAggregatorRates,
} = require('./helpers');

const { toUnit, fastForward } = require('../utils')();
const {
	toBytes32,
	constants: { ZERO_ADDRESS },
} = require('../..');

const { setupAllContracts } = require('./setup');

contract('Mimicry', accounts => {
	const [deployerAccount, owner, , , account1] = accounts;

	const mETH = toBytes32('mETH');
	const mBTC = toBytes32('mBTC');

	before(async () => {
		Mimicry = artifacts.require('Mimicry');
	});

	// TODO: Gracelyn take back out this shouldnt really be here
	describe("Mimicry", function () {
		let myContract;
		const Mimicry = artifacts.require("Mimicry")
		//const Mimicry = ethers.getContractFactory("Mimicry");
		//owner = (ethers.getSigners())[0];

		//myContract = Mimicry.deploy();
		describe("getPositions", function () {
			it.only("Should be able to mint position", async function () {
			await Mimicry.mintPosition(owner.address, 1, 0, 10);
			//const [res, offset] = await myContract.getPositions(owner.address, 100, 0);
			//expect(res.length).to.equal(1);
			//expect(res[0].bidder).to.equal(owner.address);
			//expect(offset).to.equal(1);
			//});

			//it("Should liquidate correctly", async function () {
			//await myContract.mintPosition(owner.address, 1, 0, 10);
			//await myContract.mintPosition(owner.address, 1, 0, 10);

			//await myContract.liquidatePosition(owner.address, 1);
			//const [res, offset] = await myContract.getPositions(owner.address, 100, 0);
			//console.log("res: ", res);
			//console.log("offset: ", offset);
			//expect(res.length).to.equal(1);
			// expect(res[0].bidder).to.equal(owner.address);
			// expect(offset).to.equal(2); // because second object is seen and skipped
			});
		});
	});
});
