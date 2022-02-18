# Mimicry


## TODO
1. Change token name to MIME (@gracelyn) :white_check_mark:
2. Create synthetics for sample NFT collection (@dallon) :white_check_mark:
3. Hook FE into contract layer by using [Synthetix FE Repo](https://github.com/Synthetixio/synthetix-js) as an example (@jpapi, @dallon)
4. Hook in oracle for NFT pricing (@jpapi, @dallon)

## Dev notes

To run Synthetix and Mimicry contracts on the same local node,
1. Run `nvm use 16.0.0 && npm install` in Synthetix root
2. Run `yarn chain` in monorepo root in one terminal to start a local node
3. Run `node publish build -t` in a second terminal to build with test flags (required for local dev).
4. Run `yarn deploy` from monorepo root
5. Run `cp build/compiled/* ../hardhat/deployments/localhost/` to copy the json abis into the `yarn deploy` script
5. Run `node publish deploy -y -n local --add-new-synths --ignore-safety-checks --fresh-deploy > deploy-log.txt && cd ../../ && yarn deploy` to deploy to the local node while ensuring new synth contracts will be generated and deployed. We need to ignore safety checks solely to acknowledge the contract is not upgradable and do a fresh deploy to avoid caching issues. The next command moves to the monorepo root and runs the monorepo build script that generates the interface file for the React FE.


To expedite steps 3 onward, run `cd packages/synthetix && node publish build -t && cd ../../ && yarn deploy && cd packages/synthetix && cp build/compiled/* ../hardhat/deployments/localhost/ && node publish deploy -y -n local --add-new-synths --ignore-safety-checks --fresh-deploy && cd ../../ && yarn deploy` from the monorepo root. This takes ~10 minutes to run.

Add `yarn start` to the end to start the web server.

 ---------------------------------

Our goal is to create new Synthetics for NFT collections. We can do that by using the existing `MultiCollateralSynth`. Synthetix deploys contracts representing an arbitrary synthetic by specifying the desired synthetic in config files and running a deploy script which generates a contract for that synth as a subclass of `MultiCollateralSynth`. 

We can use the same mechanism to create a synthetic for a given NFT collection. While we can manually make changes in config files, the most reliable way to do it is a find-and-replace across the whole codebase to swap an existing synthetic name for the desired name of our collection. Find and replace is more reliable because tracking down each relevant file is difficult and causes deploy failures until done thoroughly.

 ---------------------------------

We want to change the chainlink oracle used so we can fetch dynamic collection price data. The current oracles in use are found in `ExchangeRates.sol` where `Aggregator` and `Flag` interfaces are imported. We can make a GET request within an oracle as described [here](https://docs.chain.link/docs/make-a-http-get-request/).

An alternative approach to an oracle to fetch price data is to make a FE fetch and pass that result into the BE. This approach would require a nonce to verify request's validity, but the most complexity will likely come from changing flow from contract entrypoint to accommodate new argument passed from FE. So the recommended approach is to make an oracle.

The oracle needs to make a post to our [firebase appraisal endpoint](https://github.com/Mimicry-Protocol/mimicry-firebase-api/blob/main/functions/public/collection/appraisal.f.js) by specifying the collection slug in the request and parsing a `averagePriceInUsd` string from the JSON response.

Next steps are to make our specified NFT collection synths use our new oracle's method, while making sure existing synths instead use existing oracle methods. But we also need to make sure that the `Appraisal API` response includes all necessary data such that the new oracle return value shape matches that of existing oracle methods to facilitate new oracle method integration with the existing system. The former task may be approached by customizing the Synth generation logic in the deploy scripts, while the latter task may require tracking the flow of core methods (eg `issueSynths`) to the point that they interact with the existing oracle methods to know the expected return value shapes.

 --------------------------------
We want to hook the eth-scaffold FE into Synthetix. To do that, migrated Synthetics into the eth scaffold repo. The goal is use the eth scaffold `yarn deploy` script that generates contract interface files for the `react-app` package. 

To do this, we need to build synthetics and copy the contract abis from `build/compiled` into `~/packages/react-app/deployments/<network>/`. Then you can run `yarn deploy` in the eth-scaffold repo to generate the interface problems.

One problem is that Synthetics are generated in the deploy script, so we still need to get generated contracts that match the deployed contracts.

Remaining TODO:
1. Generate json files after deploy from Synth config instead of after -- we can do this by logging the output of the synthetix deploy and then running a script after deploy that scans the hardhat_config.json file and adds an address field to each json doc.


# Synthetix

[![CircleCI](https://circleci.com/gh/Synthetixio/synthetix.svg?style=svg)](https://circleci.com/gh/Synthetixio/synthetix)
[![codecov](https://codecov.io/gh/Synthetixio/synthetix/branch/develop/graph/badge.svg)](https://codecov.io/gh/Synthetixio/synthetix)
[![npm version](https://badge.fury.io/js/synthetix.svg)](https://badge.fury.io/js/synthetix)
[![Discord](https://img.shields.io/discord/413890591840272394.svg?color=768AD4&label=discord&logo=https%3A%2F%2Fdiscordapp.com%2Fassets%2F8c9701b98ad4372b58f13fd9f65f966e.svg)](https://discordapp.com/channels/413890591840272394/)
[![Twitter Follow](https://img.shields.io/twitter/follow/synthetix_io.svg?label=synthetix_io&style=social)](https://twitter.com/synthetix_io)

Synthetix is a crypto-backed synthetic asset platform.

It is a multi-token system, powered by SNX, the Synthetix Network Token. SNX holders can stake SNX to issue Synths, on-chain synthetic assets via the [Staking dApp](https://staking.synthetix.io) The network currently supports an ever growing [list of synthetic assets](https://www.synthetix.io/synths/). Please see the [list of the deployed contracts on MAIN and TESTNETS](https://docs.synthetix.io/addresses/)
Synths can be traded using [Kwenta](https://kwenta.io)

Synthetix uses a proxy system so that upgrades will not be disruptive to the functionality of the contract. This smooths user interaction, since new functionality will become available without any interruption in their experience. It is also transparent to the community at large, since each upgrade is accompanied by events announcing those upgrades. New releases are managed via the [Synthetix Improvement Proposal (SIP)](https://sips.synthetix.io/all-sip) system similar to the [EIPs](https://eips.ethereum.org/all)

Prices are committed on chain by a trusted oracle provided by [Chainlink](https://feeds.chain.link/).

Please note that this repository is under development.

For the latest system documentation see [docs.synthetix.io](https://docs.synthetix.io)

## DApps

- [staking.synthetix.io](https://staking.synthetix.io)
- [kwenta.io](https://kwenta.io)
- [stats.synthetix.io](https://stats.synthetix.io)

### Community

[![Discord](https://img.shields.io/discord/413890591840272394.svg?color=768AD4&label=discord&logo=https%3A%2F%2Fdiscordapp.com%2Fassets%2F8c9701b98ad4372b58f13fd9f65f966e.svg)](https://discordapp.com/channels/413890591840272394/) [![Twitter Follow](https://img.shields.io/twitter/follow/synthetix_io.svg?label=synthetix_io&style=social)](https://twitter.com/synthetix_io)

For a guide from the community, see [synthetix.community](https://synthetix.community)

---

## Repo Guide

### Branching

A note on the branches used in this repo.

- `master` represents the contracts live on `mainnet` and all testnets.

When a new version of the contracts makes its way through all testnets, it eventually becomes promoted in `master`, with [semver](https://semver.org/) reflecting contract changes in the `major` or `minor` portion of the version (depending on backwards compatibility). `patch` changes are simply for changes to the JavaScript interface.

### Testing

[![CircleCI](https://circleci.com/gh/Synthetixio/synthetix.svg?style=svg)](https://circleci.com/gh/Synthetixio/synthetix)
[![codecov](https://codecov.io/gh/Synthetixio/synthetix/branch/develop/graph/badge.svg)](https://codecov.io/gh/Synthetixio/synthetix)

Please see [docs.synthetix.io/contracts/testing](https://docs.synthetix.io/contracts/testing) for an overview of the automated testing methodologies.

## Module Usage

[![npm version](https://badge.fury.io/js/synthetix.svg)](https://badge.fury.io/js/synthetix)

This repo may be installed via `npm install` to support both node.js scripting applications and Solidity contract development.

### Examples

:100: Please see our walkthroughs for code examples in both JavaScript and Solidity: [docs.synthetix.io/integrations](https://docs.synthetix.io/integrations/)

### Solidity API

All interfaces are available via the path [`synthetix/contracts/interfaces`](./contracts/interfaces/).

:zap: In your code, the key is to use `IAddressResolver` which can be tied to the immutable proxy: [`ReadProxyAddressResolver`](https://contracts.synthetix.io/ReadProxyAddressResolver) ([introduced in SIP-57](https://sips.synthetix.io/sips/sip-57)). You can then fetch `Synthetix`, `FeePool`, `Depot`, et al via `IAddressResolver.getAddress(bytes32 name)` where `name` is the `bytes32` version of the contract name (case-sensitive). Or you can fetch any synth using `IAddressResolver.getSynth(bytes32 synth)` where `synth` is the `bytes32` name of the synth (e.g. `iETH`, `sUSD`, `sDEFI`).

E.g.

`npm install synthetix`

then you can write Solidity as below (using a compiler that links named imports via `node_modules`):

```solidity
pragma solidity 0.5.16;

import 'synthetix/contracts/interfaces/IAddressResolver.sol';
import 'synthetix/contracts/interfaces/ISynthetix.sol';

contract MyContract {
  // This should be instantiated with our ReadProxyAddressResolver
  // it's a ReadProxy that won't change, so safe to code it here without a setter
  // see https://docs.synthetix.io/addresses for addresses in mainnet and testnets
  IAddressResolver public synthetixResolver;

  constructor(IAddressResolver _snxResolver) public {
    synthetixResolver = _snxResolver;
  }

  function synthetixIssue() external {
    ISynthetix synthetix = synthetixResolver.getAddress('Synthetix');
    require(synthetix != address(0), 'Synthetix is missing from Synthetix resolver');

    // Issue for msg.sender = address(MyContract)
    synthetix.issueMaxSynths();
  }

  function synthetixIssueOnBehalf(address user) external {
    ISynthetix synthetix = synthetixResolver.getAddress('Synthetix');
    require(synthetix != address(0), 'Synthetix is missing from Synthetix resolver');

    // Note: this will fail if `DelegateApprovals.approveIssueOnBehalf(address(MyContract))` has
    // not yet been invoked by the `user`
    synthetix.issueMaxSynthsOnBehalf(user);
  }
}
```

### Node.js API

- `getAST({ source, match = /^contracts\// })` Returns the Abstract Syntax Tree (AST) for all compiled sources. Optionally add `source` to restrict to a single contract source, and set `match` to an empty regex if you'd like all source ASTs including third party contracts
- `getPathToNetwork({ network, file = '' })` Returns the path to the folder (or file within the folder) for the given network
- `getSource({ network })` Return `abi` and `bytecode` for a contract `source`
- `getSuspensionReasons({ code })` Return mapping of `SystemStatus` suspension codes to string reasons
- `getStakingRewards({ network })` Return the list of staking reward contracts available.
- `getSynths({ network })` Return the list of synths for a network
- `getTarget({ network })` Return the information about a contract's `address` and `source` file. The contract names are those specified in [docs.synthetix.io/addresses](https://docs.synthetix.io/addresses)
- `getTokens({ network })` Return the list of tokens (synths and `SNX`) used in the system, along with their addresses.
- `getUsers({ network })` Return the list of user accounts within the Synthetix protocol (e.g. `owner`, `fee`, etc)
- `getVersions({ network, byContract = false })` Return the list of deployed versions to the network keyed by tagged version. If `byContract` is `true`, it keys by `contract` name.
- `networks` Return the list of supported networks
- `toBytes32` Convert any string to a `bytes32` value

#### Via code

```javascript
const snx = require('synthetix');

snx.getAST();
/*
{ 'contracts/AddressResolver.sol':
   { imports:
      [ 'contracts/Owned.sol',
        'contracts/interfaces/IAddressResolver.sol',
        'contracts/interfaces/ISynthetix.sol' ],
     contracts: { AddressResolver: [Object] },
     interfaces: {},
     libraries: {} },
  'contracts/Owned.sol':
   { imports: [],
     contracts: { Owned: [Object] },
     interfaces: {},
     libraries: {} },
*/

snx.getAST({ source: 'Synthetix.sol' });
/*
{ imports:
   [ 'contracts/ExternStateToken.sol',
     'contracts/MixinResolver.sol',
     'contracts/interfaces/ISynthetix.sol',
     'contracts/TokenState.sol',
     'contracts/interfaces/ISynth.sol',
     'contracts/interfaces/IERC20.sol',
     'contracts/interfaces/ISystemStatus.sol',
     'contracts/interfaces/IExchanger.sol',
     'contracts/interfaces/IIssuer.sol',
     'contracts/interfaces/ISynthetixState.sol',
     'contracts/interfaces/IExchangeRates.sol',
     'contracts/SupplySchedule.sol',
     'contracts/interfaces/IRewardEscrow.sol',
     'contracts/interfaces/IHasBalance.sol',
     'contracts/interfaces/IRewardsDistribution.sol' ],
  contracts:
   { Synthetix:
      { functions: [Array],
        events: [Array],
        variables: [Array],
        modifiers: [Array],
        structs: [],
        inherits: [Array] } },
  interfaces: {},
  libraries: {} }
*/

// Get the path to the network
snx.getPathToNetwork({ network: 'mainnet' });
//'.../Synthetixio/synthetix/publish/deployed/mainnet'

// retrieve an object detailing the contract ABI and bytecode
snx.getSource({ network: 'rinkeby', contract: 'Proxy' });
/*
{
  bytecode: '0..0',
  abi: [ ... ]
}
*/

snx.getSuspensionReasons();
/*
{
	1: 'System Upgrade',
	2: 'Market Closure',
	3: 'Circuit breaker',
	99: 'Emergency',
};
*/

// retrieve the array of synths used
snx.getSynths({ network: 'rinkeby' }).map(({ name }) => name);
// ['sUSD', 'sEUR', ...]

// retrieve an object detailing the contract deployed to the given network.
snx.getTarget({ network: 'rinkeby', contract: 'ProxySynthetix' });
/*
{
	name: 'ProxySynthetix',
  address: '0x322A3346bf24363f451164d96A5b5cd5A7F4c337',
  source: 'Proxy',
  link: 'https://rinkeby.etherscan.io/address/0x322A3346bf24363f451164d96A5b5cd5A7F4c337',
  timestamp: '2019-03-06T23:05:43.914Z',
  txn: '',
	network: 'rinkeby'
}
*/

// retrieve the list of system user addresses
snx.getUsers({ network: 'mainnet' });
/*
[ { name: 'owner',
    address: '0xEb3107117FEAd7de89Cd14D463D340A2E6917769' },
  { name: 'deployer',
    address: '0xDe910777C787903F78C89e7a0bf7F4C435cBB1Fe' },
  { name: 'marketClosure',
    address: '0xC105Ea57Eb434Fbe44690d7Dec2702e4a2FBFCf7' },
  { name: 'oracle',
    address: '0xaC1ED4Fabbd5204E02950D68b6FC8c446AC95362' },
  { name: 'fee',
    address: '0xfeEFEEfeefEeFeefEEFEEfEeFeefEEFeeFEEFEeF' },
  { name: 'zero',
    address: '0x0000000000000000000000000000000000000000' } ]
*/

snx.getVersions();
/*
{ 'v2.21.12-107':
   { tag: 'v2.21.12-107',
     fulltag: 'v2.21.12-107',
     release: 'Hadar',
     network: 'kovan',
     date: '2020-05-08T12:52:06-04:00',
     commit: '19997724bc7eaceb902c523a6742e0bd74fc75cb',
		 contracts: { ReadProxyAddressResolver: [Object] }
		}
}
*/

snx.networks;
// [ 'local', 'kovan', 'rinkeby', 'ropsten', 'mainnet' ]

snx.toBytes32('sUSD');
// '0x7355534400000000000000000000000000000000000000000000000000000000'
```

#### As a CLI tool

Same as above but as a CLI tool that outputs JSON, using names without the `get` prefixes:

```bash
$ npx synthetix ast contracts/Synth.sol
{
  "imports": [
    "contracts/Owned.sol",
    "contracts/ExternStateToken.sol",
    "contracts/MixinResolver.sol",
    "contracts/interfaces/ISynth.sol",
    "contracts/interfaces/IERC20.sol",
    "contracts/interfaces/ISystemStatus.sol",
    "contracts/interfaces/IFeePool.sol",
    "contracts/interfaces/ISynthetix.sol",
    "contracts/interfaces/IExchanger.sol",
    "contracts/interfaces/IIssue"
    # ...
  ]
}

$ npx synthetix bytes32 sUSD
0x7355534400000000000000000000000000000000000000000000000000000000

$ npx synthetix networks
[ 'local', 'kovan', 'rinkeby', 'ropsten', 'mainnet' ]

$ npx synthetix source --network rinkeby --contract Proxy
{
  "bytecode": "0..0",
  "abi": [ ... ]
}

$ npx synthetix suspension-reason --code 2
Market Closure

$ npx synthetix synths --network rinkeby --key name
["sUSD", "sEUR", ... ]

$ npx synthetix target --network rinkeby --contract ProxySynthetix
{
  "name": "ProxySynthetix",
  "address": "0x322A3346bf24363f451164d96A5b5cd5A7F4c337",
  "source": "Proxy",
  "link": "https://rinkeby.etherscan.io/address/0x322A3346bf24363f451164d96A5b5cd5A7F4c337",
  "timestamp": "2019-03-06T23:05:43.914Z",
  "network": "rinkeby"
}

$ npx synthetix users --network mainnet --user oracle
{
  "name": "oracle",
  "address": "0xaC1ED4Fabbd5204E02950D68b6FC8c446AC95362"
}

$ npx synthetix versions
{
  "v2.0-19": {
    "tag": "v2.0-19",
    "fulltag": "v2.0-19",
    "release": "",
    "network": "mainnet",
    "date": "2019-03-11T18:17:52-04:00",
    "commit": "eeb271f4fdd2e615f9dba90503f42b2cb9f9716e",
    "contracts": {
      "Depot": {
        "address": "0x172E09691DfBbC035E37c73B62095caa16Ee2388",
        "status": "replaced",
        "replaced_in": "v2.18.1"
      },
      "ExchangeRates": {
        "address": "0x73b172756BD5DDf0110Ba8D7b88816Eb639Eb21c",
        "status": "replaced",
        "replaced_in": "v2.1.11"
      },

      # ...

    }
  }
}

$ npx synthetix versions --by-contract
{
  "Depot": [
    {
      "address": "0x172E09691DfBbC035E37c73B62095caa16Ee2388",
      "status": "replaced",
      "replaced_in": "v2.18.1"
    },
    {
      "address": "0xE1f64079aDa6Ef07b03982Ca34f1dD7152AA3b86",
      "status": "current"
    }
  ],
  "ExchangeRates": [
    {
      "address": "0x73b172756BD5DDf0110Ba8D7b88816Eb639Eb21c",
      "status": "replaced",
      "replaced_in": "v2.1.11"
    },

    # ...
  ],

  # ...
}
```
