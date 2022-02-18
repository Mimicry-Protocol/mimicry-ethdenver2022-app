'use strict';

const { contract } = require('hardhat');
const { assert, addSnapshotBeforeRestoreAfterEach } = require('./common');
const { toBytes32 } = require('../..');
const { toUnit } = require('../utils')();
const {
	setExchangeFeeRateForSynths,
	setupPriceAggregators,
	updateAggregatorRates,
} = require('./helpers');

const { setupAllContracts } = require('./setup');

contract('SynthUtil', accounts => {
	const [, ownerAccount, , account2] = accounts;
	let synthUtil, mUSDContract, synthetix, exchangeRates, systemSettings, debtCache;

	const [mUSD, mBTC, iBTC, SNX] = ['mUSD', 'mBTC', 'iBTC', 'SNX'].map(toBytes32);
	const synthKeys = [mUSD, mBTC, iBTC];
	const synthPrices = [toUnit('1'), toUnit('5000'), toUnit('5000')];

	before(async () => {
		({
			SynthUtil: synthUtil,
			SynthmUSD: mUSDContract,
			Synthetix: synthetix,
			ExchangeRates: exchangeRates,
			SystemSettings: systemSettings,
			DebtCache: debtCache,
		} = await setupAllContracts({
			accounts,
			synths: ['mUSD', 'mBTC', 'iBTC'],
			contracts: [
				'SynthUtil',
				'Synthetix',
				'Exchanger',
				'ExchangeRates',
				'ExchangeState',
				'FeePoolEternalStorage',
				'SystemSettings',
				'DebtCache',
				'Issuer',
				'CollateralManager',
				'RewardEscrowV2', // required for issuer._collateral to read collateral
			],
		}));

		await setupPriceAggregators(exchangeRates, ownerAccount, [mBTC, iBTC]);
	});

	addSnapshotBeforeRestoreAfterEach();

	beforeEach(async () => {
		await updateAggregatorRates(
			exchangeRates,
			[mBTC, iBTC, SNX],
			['5000', '5000', '0.2'].map(toUnit)
		);
		await debtCache.takeDebtSnapshot();

		// set a 0% default exchange fee rate for test purpose
		const exchangeFeeRate = toUnit('0');
		await setExchangeFeeRateForSynths({
			owner: ownerAccount,
			systemSettings,
			synthKeys,
			exchangeFeeRates: synthKeys.map(() => exchangeFeeRate),
		});
	});

	describe('given an instance', () => {
		const mUSDMinted = toUnit('10000');
		const amountToExchange = toUnit('50');
		const mUSDAmount = toUnit('100');
		beforeEach(async () => {
			await synthetix.issueSynths(mUSDMinted, {
				from: ownerAccount,
			});
			await mUSDContract.transfer(account2, mUSDAmount, { from: ownerAccount });
			await synthetix.exchange(mUSD, amountToExchange, mBTC, { from: account2 });
		});
		describe('totalSynthsInKey', () => {
			it('should return the total balance of synths into the specified currency key', async () => {
				assert.bnEqual(await synthUtil.totalSynthsInKey(account2, mUSD), mUSDAmount);
			});
		});
		describe('synthsBalances', () => {
			it('should return the balance and its value in mUSD for every synth in the wallet', async () => {
				const effectiveValue = await exchangeRates.effectiveValue(mUSD, amountToExchange, mBTC);
				assert.deepEqual(await synthUtil.synthsBalances(account2), [
					[mUSD, mBTC, iBTC],
					[toUnit('50'), effectiveValue, 0],
					[toUnit('50'), toUnit('50'), 0],
				]);
			});
		});
		describe('synthsRates', () => {
			it('should return the correct synth rates', async () => {
				assert.deepEqual(await synthUtil.synthsRates(), [synthKeys, synthPrices]);
			});
		});
		describe('synthsTotalSupplies', () => {
			it('should return the correct synth total supplies', async () => {
				const effectiveValue = await exchangeRates.effectiveValue(mUSD, amountToExchange, mBTC);
				assert.deepEqual(await synthUtil.synthsTotalSupplies(), [
					synthKeys,
					[mUSDMinted.sub(amountToExchange), effectiveValue, 0],
					[mUSDMinted.sub(amountToExchange), amountToExchange, 0],
				]);
			});
		});
	});
});
