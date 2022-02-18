const ethers = require('ethers');
const { toBytes32 } = require('../../../index');
const { assert } = require('../../contracts/common');
const { exchangeSomething } = require('../utils/exchanging');
const { ensureBalance } = require('../utils/balances');
const { skipFeePeriod, skipMinimumStakeTime } = require('../utils/skip');

function itCanStake({ ctx }) {
	describe('staking and claiming', () => {
		const SNXAmount = ethers.utils.parseEther('1000');
		const amountToIssueAndBurnmUSD = ethers.utils.parseEther('1');

		let user;
		let Synthetix, SynthmUSD, FeePool;
		let balancemUSD, debtmUSD;

		before('target contracts and users', () => {
			({ Synthetix, SynthmUSD, FeePool } = ctx.contracts);

			user = ctx.users.someUser;
		});

		before('ensure the user has enough SNX', async () => {
			await ensureBalance({ ctx, symbol: 'SNX', user, balance: SNXAmount });
		});

		describe('when the user issues mUSD', () => {
			before('record balances', async () => {
				balancemUSD = await SynthmUSD.balanceOf(user.address);
			});

			before('issue mUSD', async () => {
				Synthetix = Synthetix.connect(user);

				const tx = await Synthetix.issueSynths(amountToIssueAndBurnmUSD);
				const { gasUsed } = await tx.wait();
				console.log(`issueSynths() gas used: ${Math.round(gasUsed / 1000).toString()}k`);
			});

			it('issues the expected amount of mUSD', async () => {
				assert.bnEqual(
					await SynthmUSD.balanceOf(user.address),
					balancemUSD.add(amountToIssueAndBurnmUSD)
				);
			});

			describe('claiming', () => {
				before('exchange something', async () => {
					await exchangeSomething({ ctx });
				});

				describe('when the fee period closes', () => {
					before('skip fee period', async () => {
						await skipFeePeriod({ ctx });
					});

					before('close the current fee period', async () => {
						FeePool = FeePool.connect(ctx.users.owner);

						const tx = await FeePool.closeCurrentFeePeriod();
						await tx.wait();
					});

					describe('when the user claims rewards', () => {
						before('record balances', async () => {
							balancemUSD = await SynthmUSD.balanceOf(user.address);
						});

						before('claim', async () => {
							FeePool = FeePool.connect(user);

							const tx = await FeePool.claimFees();
							const { gasUsed } = await tx.wait();
							console.log(`claimFees() gas used: ${Math.round(gasUsed / 1000).toString()}k`);
						});

						it('shows a slight increase in the users mUSD balance', async () => {
							assert.bnGt(await SynthmUSD.balanceOf(user.address), balancemUSD);
						});
					});
				});
			});
		});

		describe('when the user burns mUSD', () => {
			before('skip min stake time', async () => {
				await skipMinimumStakeTime({ ctx });
			});

			before('record debt', async () => {
				debtmUSD = await Synthetix.debtBalanceOf(user.address, toBytes32('mUSD'));
			});

			before('burn mUSD', async () => {
				Synthetix = Synthetix.connect(user);

				const tx = await Synthetix.burnSynths(amountToIssueAndBurnmUSD);
				const { gasUsed } = await tx.wait();
				console.log(`burnSynths() gas used: ${Math.round(gasUsed / 1000).toString()}k`);
			});

			it('reduced the expected amount of debt', async () => {
				const newDebtmUSD = await Synthetix.debtBalanceOf(user.address, toBytes32('mUSD'));
				const debtReduction = debtmUSD.sub(newDebtmUSD);

				const tolerance = ethers.utils.parseUnits('0.01', 'ether');
				assert.bnClose(
					debtReduction.toString(),
					amountToIssueAndBurnmUSD.toString(),
					tolerance.toString()
				);
			});
		});
	});
}

module.exports = {
	itCanStake,
};
