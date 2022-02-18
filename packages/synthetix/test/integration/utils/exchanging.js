const ethers = require('ethers');
const { ensureBalance } = require('./balances');
const { toBytes32 } = require('../../../index');
const { updateCache } = require('../utils/rates');

async function exchangeSomething({ ctx }) {
	let { Synthetix } = ctx.contracts;
	Synthetix = Synthetix.connect(ctx.users.owner);

	const mUSDAmount = ethers.utils.parseEther('10');
	await ensureBalance({ ctx, symbol: 'mUSD', user: ctx.users.owner, balance: mUSDAmount });

	await updateCache({ ctx });

	const tx = await Synthetix.exchange(toBytes32('mUSD'), mUSDAmount, toBytes32('mETH'));
	await tx.wait();
}

async function exchangeSynths({ ctx, src, dest, amount, user }) {
	let { Synthetix } = ctx.contracts;
	Synthetix = Synthetix.connect(user);

	await ensureBalance({ ctx, symbol: src, user, balance: amount });

	const tx = await Synthetix.exchange(toBytes32(src), amount, toBytes32(dest));
	await tx.wait();
}

module.exports = {
	exchangeSomething,
	exchangeSynths,
};
