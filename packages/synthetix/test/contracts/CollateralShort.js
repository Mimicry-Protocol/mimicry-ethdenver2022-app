'use strict';

const { contract } = require('hardhat');

const { assert, addSnapshotBeforeRestoreAfterEach } = require('./common');

const { fastForward, toUnit, fromUnit } = require('../utils')();

const { setupAllContracts } = require('./setup');

const {
	ensureOnlyExpectedMutativeFunctions,
	setExchangeFeeRateForSynths,
	setupPriceAggregators,
	updateAggregatorRates,
} = require('./helpers');

const { toBytes32 } = require('../..');

contract('CollateralShort', async accounts => {
	const YEAR = 31556926;

	const mUSD = toBytes32('mUSD');
	const mETH = toBytes32('mETH');
	const mBTC = toBytes32('mBTC');

	const [, owner, , , account1, account2] = accounts;

	let short,
		managerState,
		feePool,
		exchanger,
		exchangeRates,
		addressResolver,
		mUSDSynth,
		mBTCSynth,
		mETHSynth,
		synths,
		manager,
		issuer,
		debtCache,
		systemSettings,
		FEE_ADDRESS;

	let tx, loan, id;

	const getid = tx => {
		const event = tx.logs.find(log => log.event === 'LoanCreated');
		return event.args.id;
	};

	const fastForwardAndUpdateRates = async seconds => {
		await fastForward(seconds);
		await updateRatesWithDefaults();
	};

	const issue = async (synth, issueAmount, receiver) => {
		await synth.issue(receiver, issueAmount, { from: owner });
	};

	const updateRatesWithDefaults = async () => {
		const mBTC = toBytes32('mBTC');

		await updateAggregatorRates(exchangeRates, [mETH, mBTC], [100, 10000].map(toUnit));
	};

	const setupShort = async () => {
		synths = ['mUSD', 'mBTC', 'mETH'];
		({
			ExchangeRates: exchangeRates,
			Exchanger: exchanger,
			SynthmUSD: mUSDSynth,
			SynthmBTC: mBTCSynth,
			SynthmETH: mETHSynth,
			FeePool: feePool,
			AddressResolver: addressResolver,
			Issuer: issuer,
			DebtCache: debtCache,
			CollateralShort: short,
			SystemSettings: systemSettings,
			CollateralManager: manager,
			CollateralManagerState: managerState,
		} = await setupAllContracts({
			accounts,
			synths,
			contracts: [
				'Synthetix',
				'FeePool',
				'AddressResolver',
				'Exchanger',
				'ExchangeRates',
				'SystemStatus',
				'Issuer',
				'DebtCache',
				'SystemSettings',
				'CollateralUtil',
				'CollateralShort',
				'CollateralManager',
				'CollateralManagerState',
			],
		}));

		await setupPriceAggregators(exchangeRates, owner, [mBTC, mETH]);

		await managerState.setAssociatedContract(manager.address, { from: owner });

		FEE_ADDRESS = await feePool.FEE_ADDRESS();

		await addressResolver.importAddresses(
			[toBytes32('CollateralShort'), toBytes32('CollateralManager')],
			[short.address, manager.address],
			{
				from: owner,
			}
		);

		await feePool.rebuildCache();
		await manager.rebuildCache();
		await issuer.rebuildCache();
		await debtCache.rebuildCache();

		await manager.addCollaterals([short.address], { from: owner });

		await short.addSynths(
			['SynthmBTC', 'SynthmETH'].map(toBytes32),
			['mBTC', 'mETH'].map(toBytes32),
			{ from: owner }
		);

		await manager.addSynths(
			[toBytes32('SynthmUSD'), toBytes32('SynthmBTC'), toBytes32('SynthmETH')],
			[toBytes32('mUSD'), toBytes32('mBTC'), toBytes32('mETH')],
			{
				from: owner,
			}
		);

		await manager.addShortableSynths(
			['SynthmBTC', 'SynthmETH'].map(toBytes32),
			['mBTC', 'mETH'].map(toBytes32),
			{ from: owner }
		);

		// check synths are set and currencyKeys set
		assert.isTrue(
			await manager.areSynthsAndCurrenciesSet(
				['SynthmUSD', 'SynthmBTC', 'SynthmETH'].map(toBytes32),
				['mUSD', 'mBTC', 'mETH'].map(toBytes32)
			)
		);

		assert.isTrue(
			await short.areSynthsAndCurrenciesSet(
				['SynthmBTC', 'SynthmETH'].map(toBytes32),
				['mBTC', 'mETH'].map(toBytes32)
			)
		);

		assert.isTrue(await manager.isSynthManaged(mUSD));
		assert.isTrue(await manager.isSynthManaged(mETH));
		assert.isTrue(await manager.isSynthManaged(mBTC));

		assert.isTrue(await manager.hasAllCollaterals([short.address]));

		await mUSDSynth.approve(short.address, toUnit(100000), { from: account1 });
	};

	before(async () => {
		await setupShort();
		await updateRatesWithDefaults();

		// set a 0.3% default exchange fee rate
		const exchangeFeeRate = toUnit('0.003');
		const synthKeys = [mETH, mUSD];
		await setExchangeFeeRateForSynths({
			owner,
			systemSettings,
			synthKeys,
			exchangeFeeRates: synthKeys.map(() => exchangeFeeRate),
		});

		await issue(mUSDSynth, toUnit(100000), owner);
		await issue(mBTCSynth, toUnit(1), owner);
		await issue(mETHSynth, toUnit(1), owner);
		await debtCache.takeDebtSnapshot();
	});

	describe('logic', () => {
		addSnapshotBeforeRestoreAfterEach();

		it('should ensure only expected functions are mutative', async () => {
			ensureOnlyExpectedMutativeFunctions({
				abi: short.abi,
				ignoreParents: ['Owned', 'Pausable', 'MixinResolver', 'Proxy', 'Collateral'],
				expected: [
					'open',
					'close',
					'deposit',
					'repay',
					'repayWithCollateral',
					'closeWithCollateral',
					'withdraw',
					'liquidate',
					'draw',
				],
			});
		});

		it('should set constructor params on deployment', async () => {
			assert.equal(await short.owner(), owner);
			assert.equal(await short.resolver(), addressResolver.address);
			assert.equal(await short.collateralKey(), mUSD);
			assert.equal(await short.synths(0), toBytes32('SynthmBTC'));
			assert.equal(await short.synths(1), toBytes32('SynthmETH'));
			assert.bnEqual(await short.minCratio(), toUnit(1.2));
		});

		it('should access its dependencies via the address resolver', async () => {
			assert.equal(await addressResolver.getAddress(toBytes32('SynthmUSD')), mUSDSynth.address);
			assert.equal(await addressResolver.getAddress(toBytes32('FeePool')), feePool.address);
			assert.equal(
				await addressResolver.getAddress(toBytes32('ExchangeRates')),
				exchangeRates.address
			);
		});

		describe('opening shorts', async () => {
			describe('should open a btc short', async () => {
				const oneBTC = toUnit(1);
				const mUSDCollateral = toUnit(15000);

				beforeEach(async () => {
					await issue(mUSDSynth, mUSDCollateral, account1);

					tx = await short.open(mUSDCollateral, oneBTC, mBTC, { from: account1 });

					id = getid(tx);
					loan = await short.loans(id);
				});

				it('should emit the event properly', async () => {
					assert.eventEqual(tx, 'LoanCreated', {
						account: account1,
						id: id,
						amount: oneBTC,
						collateral: mUSDCollateral,
						currency: mBTC,
					});
				});

				it('should create the short correctly', async () => {
					assert.equal(loan.account, account1);
					assert.equal(loan.collateral, mUSDCollateral.toString());
					assert.equal(loan.currency, mBTC);
					assert.equal(loan.short, true);
					assert.equal(loan.amount, oneBTC.toString());
					assert.bnEqual(loan.accruedInterest, toUnit(0));
				});

				it('should correclty issue the right balance to the shorter', async () => {
					const mUSDProceeds = toUnit(10000);

					assert.bnEqual(await mUSDSynth.balanceOf(account1), mUSDProceeds);
				});

				it('should tell the manager about the short', async () => {
					assert.bnEqual(await manager.short(mBTC), oneBTC);
				});

				it('should transfer the mUSD to the contract', async () => {
					assert.bnEqual(await mUSDSynth.balanceOf(short.address), mUSDCollateral);
				});
			});

			describe('should open an eth short', async () => {
				const oneETH = toUnit(1);
				const mUSDCollateral = toUnit(1000);

				beforeEach(async () => {
					await issue(mUSDSynth, mUSDCollateral, account1);

					tx = await short.open(mUSDCollateral, oneETH, mETH, { from: account1 });

					id = getid(tx);

					loan = await short.loans(id);
				});

				it('should emit the event properly', async () => {
					assert.eventEqual(tx, 'LoanCreated', {
						account: account1,
						id: id,
						amount: oneETH,
						collateral: mUSDCollateral,
						currency: mETH,
					});
				});

				it('should create the short correctly', async () => {
					assert.equal(loan.account, account1);
					assert.equal(loan.collateral, mUSDCollateral.toString());
					assert.equal(loan.currency, mETH);
					assert.equal(loan.short, true);
					assert.equal(loan.amount, oneETH.toString());
					assert.bnEqual(loan.accruedInterest, toUnit(0));
				});

				it('should correclty issue the right balance to the shorter', async () => {
					const mUSDProceeds = toUnit(100);

					assert.bnEqual(await mUSDSynth.balanceOf(account1), mUSDProceeds);
				});

				it('should tell the manager about the short', async () => {
					assert.bnEqual(await manager.short(mETH), oneETH);
				});
			});
		});

		describe('Repaying shorts', async () => {
			const oneETH = toUnit(1);
			const mUSDCollateral = toUnit(1000);
			const tolerance = toUnit(0.3);

			let beforeFeePoolBalance, beforeInteractionTime;

			beforeEach(async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				tx = await short.open(mUSDCollateral, oneETH, mETH, { from: account1 });

				id = getid(tx);

				loan = await short.loans(id);

				beforeInteractionTime = loan.lastInteraction;
				beforeFeePoolBalance = await mUSDSynth.balanceOf(FEE_ADDRESS);

				await fastForwardAndUpdateRates(3600);
			});

			it('should get the short amount and collateral', async () => {
				const { principal, collateral } = await short.getShortAndCollateral(account1, id);

				assert.bnEqual(principal, oneETH);
				assert.bnEqual(collateral, mUSDCollateral);
			});

			it('should repay with collateral and update the loan', async () => {
				tx = await short.repayWithCollateral(id, toUnit(0.5), {
					from: account1,
				});

				loan = await short.loans(id);

				assert.eventEqual(tx, 'LoanRepaymentMade', {
					account: account1,
					repayer: account1,
					id: id,
					amountRepaid: toUnit(0.5),
					amountAfter: loan.amount,
				});

				const { fee } = await exchanger.getAmountsForExchange(toUnit(0.5), mETH, mUSD);

				assert.bnClose(
					await mUSDSynth.balanceOf(FEE_ADDRESS),
					beforeFeePoolBalance.add(fee),
					tolerance
				);

				assert.isAbove(parseInt(loan.lastInteraction), parseInt(beforeInteractionTime));

				assert.bnClose(loan.amount, toUnit(0.5).toString(), tolerance);
				assert.bnClose(loan.collateral, toUnit(950).toString(), tolerance);
			});

			it('should repay the entire loan amount', async () => {
				tx = await short.repayWithCollateral(id, toUnit(1), {
					from: account1,
				});

				loan = await short.loans(id);

				assert.isAbove(parseInt(loan.lastInteraction), parseInt(beforeInteractionTime));

				assert.eventEqual(tx, 'LoanRepaymentMade', {
					account: account1,
					repayer: account1,
					id: id,
					amountRepaid: toUnit(1),
					amountAfter: loan.amount,
				});

				assert.equal(loan.amount, toUnit(0).toString());
				assert.bnClose(loan.collateral, toUnit(900).toString(), tolerance);
			});

			it('should repay with collateral and close the loan', async () => {
				assert.bnEqual(await mUSDSynth.balanceOf(account1), toUnit(100));

				await short.closeWithCollateral(id, { from: account1 });

				loan = await short.loans(id);

				assert.isAbove(parseInt(loan.lastInteraction), parseInt(beforeInteractionTime));

				assert.equal(loan.interestIndex, toUnit(0).toString());
				assert.equal(loan.amount, toUnit(0).toString());
				assert.equal(loan.collateral, toUnit(0).toString());

				assert.bnClose(await mUSDSynth.balanceOf(account1), toUnit(1000), tolerance);
			});

			it('should only let the borrower repay with collateral', async () => {
				await assert.revert(
					short.repayWithCollateral(id, toUnit(0.1), { from: account2 }),
					'Must be borrower'
				);
			});

			it('should not let them repay too much', async () => {
				await assert.revert(
					short.repayWithCollateral(id, toUnit(2000), { from: account1 }),
					'Payment too high'
				);
			});
		});

		describe('Drawing shorts', async () => {
			const oneETH = toUnit(1);
			const mUSDCollateral = toUnit(1000);

			beforeEach(async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				tx = await short.open(mUSDCollateral, oneETH, mETH, { from: account1 });

				id = getid(tx);

				await fastForwardAndUpdateRates(3600);

				await short.draw(id, toUnit(5), { from: account1 });
			});

			it('should update the loan', async () => {
				loan = await short.loans(id);
				assert.equal(loan.amount, toUnit(6).toString());
			});

			it('should transfer the proceeds to the user', async () => {
				assert.bnEqual(await mUSDSynth.balanceOf(account1), toUnit(600));
			});

			it('should not let them draw too much', async () => {
				await fastForwardAndUpdateRates(3600);
				await assert.revert(short.draw(id, toUnit(8), { from: account1 }), 'Cratio too low');
			});
		});

		describe('Withdrawing shorts', async () => {
			const oneETH = toUnit(1);
			const mUSDCollateral = toUnit(1000);
			let previousBalance;

			beforeEach(async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				tx = await short.open(mUSDCollateral, oneETH, mETH, { from: account1 });

				id = getid(tx);

				previousBalance = await mUSDSynth.balanceOf(account1);

				await fastForwardAndUpdateRates(3600);

				await short.withdraw(id, toUnit(100), { from: account1 });
			});

			it('should update the loan', async () => {
				loan = await short.loans(id);
				assert.equal(loan.collateral, toUnit(900).toString());
			});

			it('should transfer the withdrawn collateral to the user', async () => {
				assert.bnEqual(await mUSDSynth.balanceOf(account1), toUnit(100).add(previousBalance));
			});

			it('should not let them withdraw too much', async () => {
				await fastForwardAndUpdateRates(3600);
				await assert.revert(short.withdraw(id, toUnit(900), { from: account1 }), 'Cratio too low');
			});
		});

		describe('Closing shorts', async () => {
			const oneETH = toUnit(1);
			const mUSDCollateral = toUnit(1000);

			it('if the eth price goes down, the shorter makes profit', async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				tx = await short.open(toUnit(500), oneETH, mETH, { from: account1 });

				id = getid(tx);

				await fastForwardAndUpdateRates(3600);

				await updateAggregatorRates(exchangeRates, [mETH], [toUnit(50)]);

				// simulate buying mETH for 50 mUSD.
				await mUSDSynth.transfer(owner, toUnit(50), { from: account1 });
				await issue(mETHSynth, oneETH, account1);

				// now close the short
				await short.close(id, { from: account1 });

				// shorter has made 50 mUSD profit
				assert.bnEqual(await mUSDSynth.balanceOf(account1), toUnit(1050));
			});

			it('if the eth price goes up, the shorter makes a loss', async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				tx = await short.open(toUnit(500), oneETH, mETH, { from: account1 });

				id = getid(tx);

				await fastForwardAndUpdateRates(3600);

				await updateAggregatorRates(exchangeRates, [mETH], [toUnit(150)]);

				// simulate buying mETH for 150 mUSD.
				await mUSDSynth.transfer(owner, toUnit(150), { from: account1 });
				await issue(mETHSynth, oneETH, account1);

				// now close the short
				await short.close(id, { from: account1 });

				// shorter has made 50 mUSD loss
				assert.bnEqual(await mUSDSynth.balanceOf(account1), toUnit(950));
			});
		});

		describe('Liquidating shorts', async () => {
			const oneETH = toUnit(1);
			const mUSDCollateral = toUnit('130');
			const expectedCollateralRemaining = toUnit('108.000000000000000143');
			const expectedCollateralLiquidated = toUnit('21.999999999999999857');
			const expectedLiquidationAmount = toUnit('0.181818181818181817');
			const expectedLoanRemaining = toUnit('0.818181818181818183');

			beforeEach(async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				tx = await short.open(mUSDCollateral, oneETH, mETH, { from: account1 });

				id = getid(tx);
				await fastForwardAndUpdateRates(3600);
			});

			it('liquidation should be capped to only fix the c ratio', async () => {
				await updateAggregatorRates(exchangeRates, [mETH], [toUnit(110)]);

				// When the ETH price increases 10% to $110, the short
				// which started at 130% should allow 0.18 ETH
				// to be liquidated to restore its c ratio and no more.

				await issue(mETHSynth, oneETH, account2);

				tx = await short.liquidate(account1, id, oneETH, { from: account2 });

				assert.eventEqual(tx, 'LoanPartiallyLiquidated', {
					account: account1,
					id: id,
					liquidator: account2,
					amountLiquidated: expectedLiquidationAmount,
					collateralLiquidated: expectedCollateralLiquidated,
				});

				loan = await short.loans(id);

				assert.bnEqual(loan.amount, expectedLoanRemaining);
				assert.bnEqual(loan.collateral, expectedCollateralRemaining);

				const ratio = await short.collateralRatio(id);

				assert.bnClose(ratio, await short.minCratio(), '100');
			});
		});

		describe('System debt', async () => {
			const oneETH = toUnit(1);
			const twoETH = toUnit(2);
			const mUSDCollateral = toUnit(1000);

			it('If there is 1 ETH and 1 short ETH, then the system debt is constant before and after a price change', async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				await debtCache.takeDebtSnapshot();
				let result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				tx = await short.open(toUnit(500), oneETH, mETH, { from: account1 });

				id = getid(tx);

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				await fastForwardAndUpdateRates(3600);

				await updateAggregatorRates(exchangeRates, [mETH], [toUnit(150)]);
				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				// simulate buying mETH for 150 mUSD.
				await mUSDSynth.burn(account1, toUnit(150));
				await issue(mETHSynth, oneETH, account1);

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				// now close the short
				await short.close(id, { from: account1 });

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				// shorter has made 50 mUSD loss
				assert.bnEqual(await mUSDSynth.balanceOf(account1), toUnit(950));
			});

			it('If there is 1 ETH and 2 short ETH, then the system debt decreases if the price goes up', async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				await debtCache.takeDebtSnapshot();
				let result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				tx = await short.open(toUnit(500), twoETH, mETH, { from: account1 });

				id = getid(tx);

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				await fastForwardAndUpdateRates(3600);

				await updateAggregatorRates(exchangeRates, [mETH], [toUnit(150)]);

				// 111100 + 50 - (2 * 50) = 111,050

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111050));

				// simulate buying 2 mETH for 300 mUSD.
				await mUSDSynth.burn(account1, toUnit(300));
				await issue(mETHSynth, twoETH, account1);

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111050));

				// now close the short
				await short.close(id, { from: account1 });

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111050));

				// shorter has made 50 mUSD loss
				assert.bnEqual(await mUSDSynth.balanceOf(account1), toUnit(900));
			});

			it('If there is 1 ETH and 2 short ETH, then the system debt increases if the price goes down', async () => {
				await issue(mUSDSynth, mUSDCollateral, account1);

				await debtCache.takeDebtSnapshot();
				let result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				tx = await short.open(toUnit(500), twoETH, mETH, { from: account1 });

				id = getid(tx);

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111100));

				await fastForwardAndUpdateRates(3600);

				await updateAggregatorRates(exchangeRates, [mETH], [toUnit(50)]);

				// 111100 - 50 + (2 * 50) = 111,150

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111150));

				// simulate buying 2 mETH for 100 mUSD.
				await mUSDSynth.burn(account1, toUnit(100));
				await issue(mETHSynth, twoETH, account1);

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111150));

				// now close the short
				await short.close(id, { from: account1 });

				await debtCache.takeDebtSnapshot();
				result = await debtCache.cachedDebt();
				assert.bnEqual(result, toUnit(111150));

				// shorter has made 100 mUSD profit
				assert.bnEqual(await mUSDSynth.balanceOf(account1), toUnit(1100));
			});
		});

		describe('Determining the skew and interest rate', async () => {
			beforeEach(async () => {
				await manager.setMaxSkewRate(toUnit(0.2), { from: owner });

				// Open a short to make the long/short supply balanced.
				const oneBTC = toUnit(1);
				const mUSDCollateral = toUnit(15000);

				await issue(mUSDSynth, mUSDCollateral, account1);

				await short.open(mUSDCollateral, oneBTC, mBTC, { from: account1 });
			});

			it('should correctly determine the interest on a short', async () => {
				const oneBTC = toUnit(1);
				const mUSDCollateral = toUnit(15000);

				await issue(mUSDSynth, mUSDCollateral, account1);

				tx = await short.open(mUSDCollateral, oneBTC, mBTC, { from: account1 });
				id = getid(tx);

				// after a year we should have accrued 6.67%.

				await fastForwardAndUpdateRates(YEAR);

				// deposit some collateral to trigger the interest accrual.

				tx = await short.deposit(account1, id, toUnit(1), { from: account1 });

				loan = await short.loans(id);

				let interest = Math.round(parseFloat(fromUnit(loan.accruedInterest)) * 10000) / 10000;

				assert.equal(interest, 0.0667);

				await fastForwardAndUpdateRates(3600);

				tx = await short.deposit(account1, id, toUnit(1), { from: account1 });

				// after two years we should have accrued about 13.33%, give or take the 5 minutes we skipped.

				await fastForwardAndUpdateRates(YEAR);

				// deposit some collateral to trigger the interest accrual.

				tx = await short.deposit(account1, id, toUnit(1), { from: account1 });

				loan = await short.loans(id);

				interest = Math.round(parseFloat(fromUnit(loan.accruedInterest)) * 10000) / 10000;

				assert.equal(interest, 0.1333);
			});
		});
	});
});
