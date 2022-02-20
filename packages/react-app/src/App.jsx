import { Button, Col, Menu, Row } from "antd";
import "antd/dist/antd.css";
import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";
import { useExchangeEthPrice } from "eth-hooks/dapps/dex";
import React, { useCallback, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import "./App.css";
import {
  Account,
  Contract,
  Faucet,
  GasGauge,
  Header,
  Ramp,
  ThemeSwitch,
  NetworkDisplay,
  FaucetHint,
  NetworkSwitch,
} from "./components";
import { NETWORKS, ALCHEMY_KEY } from "./constants";
import externalContracts from "./contracts/external_contracts";
// contracts
import deployedContracts from "./contracts/hardhat_contracts.json";
import { Transactor, Web3ModalSetup } from "./helpers";
import { Home, ExampleUI, Hints, Subgraph } from "./views";
import { useStaticJsonRPC } from "./hooks";

const { ethers } = require("ethers");
/*
    Welcome to 🏗 scaffold-eth !

    Code:
    https://github.com/scaffold-eth/scaffold-eth

    Support:
    https://t.me/joinchat/KByvmRe5wkR-8F_zz6AjpA
    or DM @austingriffith on twitter or telegram

    You should get your own Alchemy.com & Infura.io ID and put it in `constants.js`
    (this is your connection to the main Ethereum network for ENS etc.)


    🌏 EXTERNAL CONTRACTS:
    You can also bring in contract artifacts in `constants.js`
    (and then use the `useExternalContractLoader()` hook!)
*/

/// 📡 What chain are your contracts deployed to?
const initialNetwork = NETWORKS.mumbai; // <------- select your target frontend network (localhost, rinkeby, xdai, mainnet)

// 😬 Sorry for all the console logging
const DEBUG_TRANSACTIONS = false;
const DEBUG = true;
const NETWORKCHECK = true;
const USE_BURNER_WALLET = true; // toggle burner wallet feature
const USE_NETWORK_SELECTOR = false;

const web3Modal = Web3ModalSetup();

const SUPPORTED_COLLECTIONS = {
  "Bufficorn Buidl Brigade": {
    slug: "https://opensea.io/collection/bufficornbuidlbrigade",
    image:
      "https://lh3.googleusercontent.com/_Qfw2lI3pYbso5-EKD7VS76UQOd7NTtcaYJ9qSGovG1X0iVm2oJNNgnepXRN5-3dDC3R2OtZQT1TpGgzNr5vp5v53ez84_lQaTjBYyY=s130",
    id: 0,
  },
  "Bored Ape Yacht Club": {
    slug: "https://opensea.io/collection/boredapeyachtclub",
    image:
      "https://lh3.googleusercontent.com/Ju9CkWtV-1Okvf45wo8UctR-M9He2PjILP0oOvxE89AyiPPGtrR3gysu1Zgy0hjd2xKIgjJJtWIc0ybj4Vd7wv8t3pxDGHoJBzDB=s130",
    id: 1,
  },
  "World of Women": {
    slug: "https://opensea.io/collection/world-of-women-nft",
    image:
      "https://lh3.googleusercontent.com/7rQxqp2cAN4J-pFJ6A22Ncb_tm2j6Lz61zXMi9bNJbmAk8PheVXcL4zVIZptVQ8_owbOJAiYuhSbn0vtjwcE4Jg7FQqDGwZTndd-_A=s130",
    id: 2,
  },
  Doodles: {
    slug: "https://opensea.io/collection/doodles-official",
    image:
      "https://lh3.googleusercontent.com/7B0qai02OdHA8P_EOVK672qUliyjQdQDGNrACxs7WnTgZAkJa_wWURnIFKeOh5VTf8cfTqW3wQpozGedaC9mteKphEOtztls02RlWQ=s130",
    id: 3,
  },
};

const getCollectionByEnum = value => {
  return value === 0
    ? "Bufficorn Buidl Brigade"
    : value === 1
    ? "Bored Ape Yacht Club"
    : value === 2
    ? "World of Women"
    : value === 3
    ? "Doodles"
    : "None";
};

const getBetTypeByEnum = value => {
  return value === 0 ? "Short the market" : value === 1 ? "For the collection" : "Against the collection";
};

// 🛰 providers
const providers = [
  "https://eth-mainnet.gateway.pokt.network/v1/lb/611156b4a585a20035148406",
  `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`,
  "https://rpc.scaffoldeth.io:48544",
];

function App(props) {
  // specify all the chains your app is available on. Eg: ['localhost', 'mainnet', ...otherNetworks ]
  // reference './constants.js' for other networks
  const networkOptions = [initialNetwork.name, "localhost"];

  const [injectedProvider, setInjectedProvider] = useState();
  const [address, setAddress] = useState();
  const [selectedNetwork, setSelectedNetwork] = useState(networkOptions[0]);
  const location = useLocation();

  const targetNetwork = NETWORKS[selectedNetwork];

  // 🔭 block explorer URL
  const blockExplorer = targetNetwork.blockExplorer;

  // load all your providers
  const localProvider = useStaticJsonRPC([
    process.env.REACT_APP_PROVIDER ? process.env.REACT_APP_PROVIDER : targetNetwork.rpcUrl,
  ]);
  const mainnetProvider = useStaticJsonRPC(providers);

  if (DEBUG) console.log(`Using ${selectedNetwork} network`);

  // 🛰 providers
  if (DEBUG) console.log("📡 Connecting to Mainnet Ethereum");

  const logoutOfWeb3Modal = async () => {
    await web3Modal.clearCachedProvider();
    if (injectedProvider && injectedProvider.provider && typeof injectedProvider.provider.disconnect == "function") {
      await injectedProvider.provider.disconnect();
    }
    setTimeout(() => {
      window.location.reload();
    }, 1);
  };

  /* 💵 This hook will get the price of ETH from 🦄 Uniswap: */
  const price = useExchangeEthPrice(targetNetwork, mainnetProvider);

  /* 🔥 This hook will get the price of Gas from ⛽️ EtherGasStation */
  const gasPrice = useGasPrice(targetNetwork, "fast");
  // Use your injected provider from 🦊 Metamask or if you don't have it then instantly generate a 🔥 burner wallet.
  const userProviderAndSigner = useUserProviderAndSigner(injectedProvider, localProvider, USE_BURNER_WALLET);
  const userSigner = userProviderAndSigner.signer;

  useEffect(() => {
    async function getAddress() {
      if (userSigner) {
        const newAddress = await userSigner.getAddress();
        setAddress(newAddress);
      }
    }
    getAddress();
  }, [userSigner]);

  // You can warn the user if you would like them to be on a specific network
  const localChainId = localProvider && localProvider._network && localProvider._network.chainId;
  const selectedChainId =
    userSigner && userSigner.provider && userSigner.provider._network && userSigner.provider._network.chainId;

  // For more hooks, check out 🔗eth-hooks at: https://www.npmjs.com/package/eth-hooks

  // The transactor wraps transactions and provides notificiations
  const tx = DEBUG_TRANSACTIONS ? Transactor(localProvider, gasPrice) : Transactor(userSigner, gasPrice);

  // 🏗 scaffold-eth is full of handy hooks like this one to get your balance:
  const yourLocalBalance = useBalance(localProvider, address);

  // Just plug in different 🛰 providers to get your balance on different chains:
  const yourMainnetBalance = useBalance(mainnetProvider, address);

  // const contractConfig = useContractConfig();

  const contractConfig = { deployedContracts: deployedContracts || {}, externalContracts: externalContracts || {} };

  // Load in your local 📝 contract and read a value from it:
  const readContracts = useContractLoader(localProvider, contractConfig, localChainId);

  // If you want to make 🔐 write transactions to your contracts, use the userSigner:
  const writeContracts = useContractLoader(userSigner, contractConfig, localChainId);

  // EXTERNAL CONTRACT EXAMPLE:
  //
  // If you want to bring in the mainnet DAI contract it would look like:
  const mainnetContracts = useContractLoader(mainnetProvider, contractConfig);

  // If you want to call a function on a new block
  useOnBlock(mainnetProvider, () => {
    console.log(`⛓ A new mainnet block is here: ${mainnetProvider._lastBlockNumber}`);
  });

  // Then read your DAI balance like:
  const myMainnetDAIBalance = useContractReader(mainnetContracts, "DAI", "balanceOf", [
    "0x34aA3F359A9D614239015126635CE7732c18fDF3",
  ]);

  // keep track of a variable from the contract in the local React state:
  const purpose = useContractReader(readContracts, "Mimicry", "purpose");

  /*
  const addressFromENS = useResolveName(mainnetProvider, "austingriffith.eth");
  console.log("🏷 Resolved austingriffith.eth as:",addressFromENS)
  */

  //
  // 🧫 DEBUG 👨🏻‍🔬
  //
  useEffect(() => {
    if (
      DEBUG &&
      mainnetProvider &&
      address &&
      selectedChainId &&
      yourLocalBalance &&
      yourMainnetBalance &&
      readContracts &&
      writeContracts &&
      mainnetContracts
    ) {
      console.log("_____________________________________ 🏗 scaffold-eth _____________________________________");
      console.log("🌎 mainnetProvider", mainnetProvider);
      console.log("🏠 localChainId", localChainId);
      console.log("👩‍💼 selected address:", address);
      console.log("🕵🏻‍♂️ selectedChainId:", selectedChainId);
      console.log("💵 yourLocalBalance", yourLocalBalance ? ethers.utils.formatEther(yourLocalBalance) : "...");
      console.log("💵 yourMainnetBalance", yourMainnetBalance ? ethers.utils.formatEther(yourMainnetBalance) : "...");
      console.log("📝 readContracts", readContracts);
      console.log("🌍 DAI contract on mainnet:", mainnetContracts);
      console.log("💵 yourMainnetDAIBalance", myMainnetDAIBalance);
      console.log("🔐 writeContracts", writeContracts);
    }
  }, [
    mainnetProvider,
    address,
    selectedChainId,
    yourLocalBalance,
    yourMainnetBalance,
    readContracts,
    writeContracts,
    mainnetContracts,
    localChainId,
    myMainnetDAIBalance,
  ]);

  const loadWeb3Modal = useCallback(async () => {
    const provider = await web3Modal.connect();
    setInjectedProvider(new ethers.providers.Web3Provider(provider));

    provider.on("chainChanged", chainId => {
      console.log(`chain changed to ${chainId}! updating providers`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    provider.on("accountsChanged", () => {
      console.log(`account changed!`);
      setInjectedProvider(new ethers.providers.Web3Provider(provider));
    });

    // Subscribe to session disconnection
    provider.on("disconnect", (code, reason) => {
      console.log(code, reason);
      logoutOfWeb3Modal();
    });
    // eslint-disable-next-line
  }, [setInjectedProvider]);

  useEffect(() => {
    if (web3Modal.cachedProvider) {
      loadWeb3Modal();
    }
  }, [loadWeb3Modal]);

  const [userPositions, setUserPositions] = useState([]);
  const [offset, setOffset] = useState(0);
  const [didFetchLastPage, setDidFetchLastPage] = useState(false);
  const limit = 100;

  const getUserPositions = async ({
    address,
    readContracts,
    limit,
    offset,
    setOffset,
    didFetchLastPage,
    setDidFetchLastPage,
    userPositions,
    setUserPositions,
  }) => {
    if (!didFetchLastPage && address && readContracts && readContracts.Mimicry) {
      try {
        const [nextPage, nextOffset] = await readContracts.Mimicry.getPositions(address);
        if (nextPage && nextPage.length > 0) {
          // TODO: fix this on BE instead of filtering it out on FE
          const tmpPositions = userPositions.concat(nextPage.filter((x) => Number(x.creationTimestamp._hex) > 0));
          setUserPositions(tmpPositions);
        }
        // if (parseInt(nextOffset._hex) === offset || nextPage.length < limit) {
        //   setDidFetchLastPage(true);
        // }
        // setOffset(parseInt(nextOffset._hex));
        setDidFetchLastPage(true);
      } catch (e) {
        console.log("ERROR IN GETTING USER POSITIONS", e);
        setDidFetchLastPage(true);
      }
    }
  };

  useEffect(() => {
    getUserPositions({
      address,
      readContracts,
      limit,
      offset,
      setOffset,
      didFetchLastPage,
      setDidFetchLastPage,
      userPositions,
      setUserPositions,
    });
  }, [address, readContracts, offset]);

  const faucetAvailable = localProvider && localProvider.connection && targetNetwork.name.indexOf("local") !== -1;

  const submitBetHandler = () => {
    const shortMarketType = document.getElementById("betshort").checked;
    const forCollectionType = document.getElementById("betfor").checked;
    const againstCollectionType = document.getElementById("betagainst").checked;

    // make sure at least one is selected
    if (!shortMarketType && !forCollectionType && !againstCollectionType) {
      alert("You must select one of the options");
      return;
    }

    const betType = shortMarketType ? 0 : forCollectionType ? 1 : 2;
    const collectionSelection = document.getElementById("collections");
    const selectedCollectionKey = collectionSelection.options[collectionSelection.selectedIndex].text;
    const selectedCollectionId = SUPPORTED_COLLECTIONS[selectedCollectionKey].id;

    const usdcAmount = Number(document.getElementById("usdcbid").value);
    if (usdcAmount <= 0) {
      alert("Your bid amount must be greater than 0");
      return;
    }

    if (DEBUG_TRANSACTIONS) {
      // send faucet eth to debug transaction
      tx({
        to: address,
        value: ethers.utils.parseEther("0.1"),
      });
    }

    try {
      tx(writeContracts.Mimicry.mintPosition(address, betType, selectedCollectionId, usdcAmount));
    } catch (e) {
      console.log(e);
    }
  };

  const selectCollectionHandler = () => {
    const collectionSelection = document.getElementById("collections");
    const selectedCollectionKey = collectionSelection.options[collectionSelection.selectedIndex].text;
    const collectionSlug = SUPPORTED_COLLECTIONS[selectedCollectionKey].slug;
    const collectionImgSrc = SUPPORTED_COLLECTIONS[selectedCollectionKey].image;

    // make image visible and set the source
    const img = document.getElementById("collectionimage");
    img.src = collectionImgSrc;
    img.style.display = "block";

    // make header click redirect to collection
    const hrefTag = document.getElementById("collectionNameHref");
    hrefTag.href = collectionSlug;

    // make header text appear
    const headerText = document.getElementById("collectionNameHeader");
    headerText.textContent = selectedCollectionKey;
  };

  const selectUserPositionHandler = () => {
    // TODO -- display details in a pretty way
  };

  const submitLiquidateHandler = ({ userPositions, setUserPositions, setOffset, setDidFetchLastPage }) => {
    const positionSelection = document.getElementById("userpositions");
    const tokenId = Number(positionSelection.options[positionSelection.selectedIndex].value);

    if (DEBUG_TRANSACTIONS) {
      // send faucet eth to debug transaction
      tx({
        to: address,
        value: ethers.utils.parseEther("0.1"),
      });
    }
    try {
      tx(writeContracts.Mimicry.liquidatePosition(address, tokenId));
    } catch (e) {
      console.log("error in liquidating", e);
    }

    const newUserPositions = userPositions.filter(x => Number(x.tokenId._hex) !== tokenId);
    setUserPositions(newUserPositions);
    setOffset(0);
    setDidFetchLastPage(0);
  };

  return (
    <div className="App">
      {/* ✏️ Edit the header and change the title to your project name */}
      <Header />
      <NetworkDisplay
        NETWORKCHECK={NETWORKCHECK}
        localChainId={localChainId}
        selectedChainId={selectedChainId}
        targetNetwork={targetNetwork}
        logoutOfWeb3Modal={logoutOfWeb3Modal}
        USE_NETWORK_SELECTOR={USE_NETWORK_SELECTOR}
      />

      <Menu style={{ textAlign: "center", marginTop: 40 }} selectedKeys={[location.pathname]} mode="horizontal">
        <Menu.Item key="/">
          <Link to="/">Bid</Link>
        </Menu.Item>
        <Menu.Item key="/liquidate">
          <Link to="/liquidate">Liquidate</Link>
        </Menu.Item>
      </Menu>

      <Switch>
        <Route exact path="/">
          <div>
            <br />
            <label>Short the market</label>
            <input type="radio" value="short" id="betshort" name="bettype" />
            <br />
            <label>Bet for a collection</label>
            <input type="radio" value="for" id="betfor" name="bettype" />
            <br />
            <label>Bet against a collection</label>
            <input type="radio" value="against" id="betagainst" name="bettype" />
            <br />
            <br />
            <label>Select your collection</label>
            <br />
            <select name="collections" id="collections" onChange={() => selectCollectionHandler()}>
              {Object.keys(SUPPORTED_COLLECTIONS).map(key => (
                <option value={key}>{key}</option>
              ))}
            </select>
            <br />
            <a href="#" id="collectionNameHref">
              <h2 id="collectionNameHeader"></h2>
            </a>
            <br />
            <img id="collectionimage" style={{ display: "none", margin: "auto", maxWidth: "50%", maxHeight: "50%" }} />
            <br />
            <input type="number" placeholder="Enter USDC amount for your bid" name="usdcbid" id="usdcbid" />
            <button onClick={() => submitBetHandler({ setDidFetchLastPage })}>Submit</button>
          </div>
        </Route>
        <Route exact path="/liquidate">
          <br />
          <div>
            {userPositions.length > 0 ? (
              <select name="userpositions" id="userpositions" onChange={() => selectUserPositionHandler()}>
                {userPositions.map(key => {
                  const tokenId = Number(key.tokenId._hex);
                  const collateralAmt = Number(key.collateralAmt._hex);
                  const collection = getCollectionByEnum(Number(key.collection._hex));
                  const betType = getBetTypeByEnum(Number(key.betType._hex));
                  return (
                    <option
                      value={tokenId}
                    >{`Token: ${tokenId} - Collateral: ${collateralAmt} - Collection: ${collection} - Bet Type: ${betType}`}</option>
                  );
                })}
              </select>
            ) : (
              <h3>You don't have any open positions</h3>
            )}
            {userPositions.length > 0 ? (
              <button
                onClick={() =>
                  submitLiquidateHandler({ userPositions, setUserPositions, setOffset, setDidFetchLastPage })
                }
              >
                Liquidate
              </button>
            ) : null}
          </div>
        </Route>
      </Switch>

      <ThemeSwitch />

      {/* 👨‍💼 Your account is in the top right with a wallet at connect options */}
      <div style={{ position: "fixed", textAlign: "right", right: 0, top: 0, padding: 10 }}>
        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          {USE_NETWORK_SELECTOR && (
            <div style={{ marginRight: 20 }}>
              <NetworkSwitch
                networkOptions={networkOptions}
                selectedNetwork={selectedNetwork}
                setSelectedNetwork={setSelectedNetwork}
              />
            </div>
          )}
          <Account
            useBurner={USE_BURNER_WALLET}
            address={address}
            localProvider={localProvider}
            userSigner={userSigner}
            mainnetProvider={mainnetProvider}
            price={price}
            web3Modal={web3Modal}
            loadWeb3Modal={loadWeb3Modal}
            logoutOfWeb3Modal={logoutOfWeb3Modal}
            blockExplorer={blockExplorer}
          />
        </div>
        {yourLocalBalance.lte(ethers.BigNumber.from("0")) && (
          <FaucetHint localProvider={localProvider} targetNetwork={targetNetwork} address={address} />
        )}
      </div>
    </div>
  );
}

export default App;
