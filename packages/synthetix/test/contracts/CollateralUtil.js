'use strict';

const { contract, web3 } = require('hardhat');

const { assert, addSnapshotBeforeRestoreAfterEach } = require('./common');

const { toUnit } = require('../utils')();

const { setupAllContracts, setupContract, mockToken } = require('./setup');

const {
	ensureOnlyExpectedMutativeFunctions,
	setupPriceAggregators,
	updateAggregatorRates,
} = require('./helpers');

const { toBytes32 } = require('../..');

contract('CollateralUtil', async accounts => {
	const mUSD = toBytes32('mUSD');
	const mETH = toBytes32('mETH');
	const mBTC = toBytes32('mBTC');

	const oneRenBTC = web3.utils.toBN('100000000');
	const oneThousandmUSD = toUnit(1000);
	const fiveThousandmUSD = toUnit(5000);

	let tx;
	let id;

	const name = 'Some name';
	const symbol = 'TOKEN';

	const [, owner, , , account1] = accounts;

	let cerc20,
		managerState,
		feePool,
		exchangeRates,
		addressResolver,
		mUSDSynth,
		mBTCSynth,
		renBTC,
		synths,
		manager,
		issuer,
		util,
		debtCache;

	const getid = tx => {
		const event = tx.logs.find(log => log.event === 'LoanCreated');
		return event.args.id;
	};

	const issuemUSDToAccount = async (issueAmount, receiver) => {
		// Set up the depositor with an amount of synths to deposit.
		await mUSDSynth.issue(receiver, issueAmount, {
			from: owner,
		});
	};

	const issuemBTCtoAccount = async (issueAmount, receiver) => {
		await mBTCSynth.issue(receiver, issueAmount, { from: owner });
	};

	const issueRenBTCtoAccount = async (issueAmount, receiver) => {
		await renBTC.transfer(receiver, issueAmount, { from: owner });
	};

	const deployCollateral = async ({
		owner,
		manager,
		resolver,
		collatKey,
		minColat,
		minSize,
		underCon,
		decimals,
	}) => {
		return setupContract({
			accounts,
			contract: 'CollateralErc20',
			args: [owner, manager, resolver, collatKey, minColat, minSize, underCon, decimals],
		});
	};

	const setupMultiCollateral = async () => {
		synths = ['mUSD', 'mBTC'];
		({
			ExchangeRates: exchangeRates,
			SynthmUSD: mUSDSynth,
			SynthmBTC: mBTCSynth,
			FeePool: feePool,
			AddressResolver: addressResolver,
			Issuer: issuer,
			CollateralUtil: util,
			DebtCache: debtCache,
			CollateralManager: manager,
			CollateralManagerState: managerState,
		} = await setupAllContracts({
			accounts,
			synths,
			contracts: [
				'Synthetix',
				'FeePool',
				'AddressResolver',
				'ExchangeRates',
				'SystemStatus',
				'Issuer',
				'DebtCache',
				'Exchanger',
				'CollateralUtil',
				'CollateralManager',
				'CollateralManagerState',
			],
		}));

		await setupPriceAggregators(exchangeRates, owner, [mBTC, mETH]);

		await managerState.setAssociatedContract(manager.address, { from: owner });

		({ token: renBTC } = await mockToken({
			accounts,
			name,
			symbol,
			supply: 1e6,
		}));

		cerc20 = await deployCollateral({
			owner: owner,
			manager: manager.address,
			resolver: addressResolver.address,
			collatKey: mBTC,
			minColat: toUnit(1.5),
			minSize: toUnit(0.1),
			underCon: renBTC.address,
			decimals: 8,
		});

		await addressResolver.importAddresses(
			[toBytes32('CollateralErc20'), toBytes32('CollateralManager')],
			[cerc20.address, manager.address],
			{
				from: owner,
			}
		);

		await feePool.rebuildCache();
		await manager.rebuildCache();
		await issuer.rebuildCache();
		await debtCache.rebuildCache();

		await manager.addCollaterals([cerc20.address], { from: owner });

		await cerc20.addSynths(
			['SynthmUSD', 'SynthmBTC'].map(toBytes32),
			['mUSD', 'mBTC'].map(toBytes32),
			{ from: owner }
		);

		await manager.addSynths(
			['SynthmUSD', 'SynthmBTC'].map(toBytes32),
			['mUSD', 'mBTC'].map(toBytes32),
			{ from: owner }
		);
		// rebuild the cache to add the synths we need.
		await manager.rebuildCache();

		// Issue ren and set allowance
		await issueRenBTCtoAccount(100 * 1e8, account1);
		await renBTC.approve(cerc20.address, 100 * 1e8, { from: account1 });
	};

	before(async () => {
		await setupMultiCollateral();
	});

	addSnapshotBeforeRestoreAfterEach();

	beforeEach(async () => {
		await updateAggregatorRates(exchangeRates, [mETH, mBTC], [100, 10000].map(toUnit));

		await issuemUSDToAccount(toUnit(1000), owner);
		await issuemBTCtoAccount(toUnit(10), owner);

		await debtCache.takeDebtSnapshot();
	});

	it('should ensure only expected functions are mutative', async () => {
		ensureOnlyExpectedMutativeFunctions({
			abi: util.abi,
			ignoreParents: ['MixinResolver'],
			expected: [],
		});
	});

	describe('liquidation amount test', async () => {
		let amountToLiquidate;

		/**
		 * r = target issuance ratio
		 * D = debt balance in mUSD
		 * V = Collateral VALUE in mUSD
		 * P = liquidation penalty
		 * Calculates amount of mUSD = (D - V * r) / (1 - (1 + P) * r)
		 *
		 * To go back to another synth, remember to do effective value
		 */

		beforeEach(async () => {
			tx = await cerc20.open(oneRenBTC, fiveThousandmUSD, mUSD, {
				from: account1,
			});

			id = getid(tx);
		});

		it('when we start at 200%, we can take a 25% reduction in collateral prices', async () => {
			await updateAggregatorRates(exchangeRates, [mBTC], [toUnit(7500)]);

			amountToLiquidate = await cerc20.liquidationAmount(id);

			assert.bnEqual(amountToLiquidate, toUnit(0));
		});

		it('when we start at 200%, a price shock of 30% in the collateral requires 25% of the loan to be liquidated', async () => {
			await updateAggregatorRates(exchangeRates, [mBTC], [toUnit(7000)]);

			amountToLiquidate = await cerc20.liquidationAmount(id);

			assert.bnClose(amountToLiquidate, toUnit(1250), '10000');
		});

		it('when we start at 200%, a price shock of 40% in the collateral requires 75% of the loan to be liquidated', async () => {
			await updateAggregatorRates(exchangeRates, [mBTC], [toUnit(6000)]);

			amountToLiquidate = await cerc20.liquidationAmount(id);

			assert.bnClose(amountToLiquidate, toUnit(3750), '10000');
		});

		it('when we start at 200%, a price shock of 45% in the collateral requires 100% of the loan to be liquidated', async () => {
			await updateAggregatorRates(exchangeRates, [mBTC], [toUnit(5500)]);
			amountToLiquidate = await cerc20.liquidationAmount(id);

			assert.bnClose(amountToLiquidate, toUnit(5000), '10000');
		});
	});

	describe('collateral redeemed test', async () => {
		let collateralRedeemed;
		let collateralKey;

		beforeEach(async () => {
			collateralKey = await cerc20.collateralKey();
		});

		it('when BTC is @ $10000 and we are liquidating 1000 mUSD, then redeem 0.11 BTC', async () => {
			collateralRedeemed = await util.collateralRedeemed(mUSD, oneThousandmUSD, collateralKey);

			assert.bnEqual(collateralRedeemed, toUnit(0.11));
		});

		it('when BTC is @ $20000 and we are liquidating 1000 mUSD, then redeem 0.055 BTC', async () => {
			await updateAggregatorRates(exchangeRates, [mBTC], [toUnit(20000)]);

			collateralRedeemed = await util.collateralRedeemed(mUSD, oneThousandmUSD, collateralKey);

			assert.bnEqual(collateralRedeemed, toUnit(0.055));
		});

		it('when BTC is @ $7000 and we are liquidating 2500 mUSD, then redeem 0.36666 ETH', async () => {
			await updateAggregatorRates(exchangeRates, [mBTC], [toUnit(7000)]);

			collateralRedeemed = await util.collateralRedeemed(mUSD, toUnit(2500), collateralKey);

			assert.bnClose(collateralRedeemed, toUnit(0.392857142857142857), '100');
		});

		it('regardless of BTC price, we liquidate 1.1 * amount when doing mETH', async () => {
			collateralRedeemed = await util.collateralRedeemed(mBTC, toUnit(1), collateralKey);

			assert.bnEqual(collateralRedeemed, toUnit(1.1));

			await updateAggregatorRates(exchangeRates, [mBTC], [toUnit(1000)]);

			collateralRedeemed = await util.collateralRedeemed(mBTC, toUnit(1), collateralKey);

			assert.bnEqual(collateralRedeemed, toUnit(1.1));
		});
	});
});
