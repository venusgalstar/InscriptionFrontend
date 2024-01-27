import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { Button, Card, Input, Radio } from "antd";
import { Buffer, constants } from 'buffer';
import axios from 'axios';
window.Buffer = Buffer;
// import { Transaction } from "bitcoinjs-lib";
// import { script, Psbt, payments, networks, address as addressLib, Transaction } from 'bitcoinjs-lib';

const bitcore = require('bitcore-lib');

const { PrivateKey, Address, Transaction, Script, Opcode } = bitcore;
const { Hash, Signature } = bitcore.crypto;

type UTXO = {
  txid: string;
  vout: number;
  satoshis: number;
};

type WalletType = {
  publicKey: string;
  address: string;
  utxos: UTXO[];
};

let wallet: WalletType = {
  publicKey: "",
  address: "",
  utxos: [],
};

function App() {
  const [unisatInstalled, setUnisatInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [publicKey, setPublicKey] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState({
    confirmed: 0,
    unconfirmed: 0,
    total: 0,
  });
  const [network, setNetwork] = useState("livenet");

  async function getUTXOs(curAddress: string, curNetwork: string) {
    // const url = `https://blockstream.info/api/address/bc1qpqnxhggyd7n8wnukxwquxmd4n2j0vr3fcm3a96/utxo`; // mainnet
    console.log("network", network);
    const utxoUrl = curNetwork === 'livenet' ?
      `https://blockstream.info/api/address/${curAddress}` : // mainnet
      `https://blockstream.info/testnet/api/address/${curAddress}`; //testnet

    const ordinalsExplorerUrl = curNetwork === 'livenet' ?
      'https://ordinals.com' : 'https://testnet.ordinals.com';

    const res1 = await (window as any).unisat.getInscriptions(0, 10);
    console.log("getInscriptions", res1);

    const utxoApi = axios.create({
      baseURL: utxoUrl,
      // You can add other default settings here
    });
    const res = await utxoApi.get("/utxo");
    // const res = await axios.get(url);
    console.log("res", res);

    let idx: number;

    for (idx = 0; idx < res.data.length; idx++) {

      let output = res.data[idx];

      const ordApi = axios.create({
        baseURL: ordinalsExplorerUrl,
        // You can add other default settings here
      });

      const response1 = await ordApi.get(`/output/${output.txid}:${output.vout}`);

      // console.log("ordinal api", res.data);
      console.log("ordinal api", res.data.indexOf("iframe"));

      if (response1.data.indexOf("iframe") == -1) {

        console.log("not inscribe", res);
        wallet.utxos.push({
          txid: output.txid,
          vout: output.vout,
          satoshis: output.value
        });
      }
      console.log("wallet", wallet);
    }
  }

  const getBasicInfo = async () => {
    const unisat = (window as any).unisat;
    const [address] = await unisat.getAccounts();
    console.log("address", address);
    setAddress(address);
    wallet.address = address;
    console.log("address", address);

    const publicKey = await unisat.getPublicKey();
    setPublicKey(publicKey);
    wallet.publicKey = publicKey;

    const balance = await unisat.getBalance();
    setBalance(balance);

    const network = await unisat.getNetwork();
    setNetwork(network);
    console.log("network", network);

    await getUTXOs(address, network);
  };

  const selfRef = useRef<{ accounts: string[] }>({
    accounts: [],
  });
  const self = selfRef.current;
  const handleAccountsChanged = (_accounts: string[]) => {
    if (self.accounts[0] === _accounts[0]) {
      // prevent from triggering twice
      return;
    }
    self.accounts = _accounts;
    if (_accounts.length > 0) {
      setAccounts(_accounts);
      setConnected(true);

      setAddress(_accounts[0]);

      getBasicInfo();
    } else {
      setConnected(false);
    }
  };

  const handleNetworkChanged = (network: string) => {
    setNetwork(network);
    getBasicInfo();
  };

  useEffect(() => {

    async function checkUnisat() {
      let unisat = (window as any).unisat;

      for (let i = 1; i < 10 && !unisat; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * i));
        unisat = (window as any).unisat;
      }

      if (unisat) {
        setUnisatInstalled(true);
      } else if (!unisat)
        return;

      unisat.getAccounts().then((accounts: string[]) => {
        handleAccountsChanged(accounts);
      });

      unisat.on("accountsChanged", handleAccountsChanged);
      unisat.on("networkChanged", handleNetworkChanged);

      return () => {
        unisat.removeListener("accountsChanged", handleAccountsChanged);
        unisat.removeListener("networkChanged", handleNetworkChanged);
      };
    }

    checkUnisat().then();
  }, []);

  if (!unisatInstalled) {
    return (
      <div className="App">
        <header className="App-header">
          <div>
            <Button
              onClick={() => {
                window.location.href = "https://unisat.io";
              }}
            >
              Install Unisat Wallet
            </Button>
          </div>
        </header>
      </div>
    );
  }
  const unisat = (window as any).unisat;
  return (
    <div className="App">
      <header className="App-header">
        <p>Unisat Wallet Demo</p>

        {connected ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Card
              size="small"
              title="Basic Info"
              style={{ width: 300, margin: 10 }}
            >
              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>Address:</div>
                <div style={{ wordWrap: "break-word" }}>{address}</div>
              </div>

              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>PublicKey:</div>
                <div style={{ wordWrap: "break-word" }}>{publicKey}</div>
              </div>

              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>Balance: (Satoshis)</div>
                <div style={{ wordWrap: "break-word" }}>{balance.total}</div>
              </div>
            </Card>

            <Card
              size="small"
              title="Switch Network"
              style={{ width: 300, margin: 10 }}
            >
              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>Network:</div>
                <Radio.Group
                  onChange={async (e) => {
                    const network = await unisat.switchNetwork(e.target.value);
                    setNetwork(network);
                  }}
                  value={network}
                >
                  <Radio value={"livenet"}>livenet</Radio>
                  <Radio value={"testnet"}>testnet</Radio>
                </Radio.Group>
              </div>
            </Card>

            <MakeInscriptionCard />
          </div>
        ) : (
          <div>
            <Button
              onClick={async () => {
                const result = await unisat.requestAccounts();
                handleAccountsChanged(result);
              }}
            >
              Connect Unisat Wallet
            </Button>
          </div>
        )}
      </header>
    </div>
  );
}

function MakeInscriptionCard() {
  const [inscriptionText, setInscriptionText] = useState("");
  const [hashResult, setHashResult] = useState("");
  return (
    <Card size="small" title="Sign Psbt" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>InscriptionText:</div>
        <Input
          defaultValue={inscriptionText}
          onChange={(e) => {
            setInscriptionText(e.target.value);
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Result:</div>
        <div style={{ wordWrap: "break-word" }}>{hashResult}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            const psbtResult = await (window as any).unisat.signPsbt(inscriptionText);
            setHashResult(psbtResult);
          } catch (e) {
            setHashResult((e as any).message);
          }
        }}
      >
        Make Inscription
      </Button>
    </Card>
  );
}

function bufferToChunk(b: Buffer, type?: any) {
  const buffer = Buffer.from(b, type);
  return {
    buf: b.length ? b : undefined,
    len: b.length,
    opcodenum: b.length <= 75 ? b.length : b.length <= 255 ? 76 : 77
  }
}

function numberToChunk(n: number) {
  return {
    buf: n <= 16 ? undefined : n < 128 ? Buffer.from([n]) : Buffer.from([n % 256, n / 256]),
    len: n <= 16 ? 0 : n < 128 ? 1 : 2,
    opcodenum: n == 0 ? 0 : n <= 16 ? 80 + n : n < 128 ? 1 : 2
  }
}

function opcodeToChunk(op: any) {
  return { opcodenum: op };
}

function fund(wallet: WalletType, tx: typeof Transaction) {
  tx.change(wallet.address)
  delete tx._fee

  for (const utxo of wallet.utxos) {
    if (tx.inputs.length && tx.outputs.length && tx.inputAmount >= tx.outputAmount + tx.getFee()) {
      break
    }

    delete tx._fee
    tx.from(utxo)
    tx.change(wallet.address)
    // tx.sign(wallet.privkey)
  }

  if (tx.inputAmount < tx.outputAmount + tx.getFee()) {
    throw new Error('not enough funds')
  }
}

function updateWallet(wallet: WalletType, tx: typeof Transaction) {
  wallet.utxos = wallet.utxos.filter(utxo => {
    for (const input of tx.inputs) {
      if (input.prevTxId.toString('hex') == utxo.txid && input.outputIndex == utxo.vout) {
        return false
      }
    }
    return true
  })

  tx.outputs
    .forEach((output: any, vout: any) => {
      if (output.script.toAddress().toString() == wallet.address) {
        wallet.utxos.push({
          txid: tx.hash,
          vout,
          satoshis: output.satoshis
        })
      }
    })
}

function inscribe(wallet: WalletType, address: any, contentType: any, data: any) {
  let txs = []
  const MAX_CHUNK_LEN = 240
  const MAX_PAYLOAD_LEN = 1500

  // let privateKey = new PrivateKey(wallet.privkey)
  let publicKey = wallet.publicKey;


  let parts = []
  while (data.length) {
    let part = data.slice(0, Math.min(MAX_CHUNK_LEN, data.length))
    data = data.slice(part.length)
    parts.push(part)
  }


  let inscription = new Script()
  inscription.chunks.push(bufferToChunk(Buffer.from('ord')))
  inscription.chunks.push(numberToChunk(parts.length))
  inscription.chunks.push(bufferToChunk(contentType))
  parts.forEach((part, n) => {
    inscription.chunks.push(numberToChunk(parts.length - n - 1))
    inscription.chunks.push(bufferToChunk(part))
  })

  let p2shInput
  let lastLock
  let lastPartial

  while (inscription.chunks.length) {
    let partial = new Script()

    if (txs.length == 0) {
      partial.chunks.push(inscription.chunks.shift())
    }

    while (partial.toBuffer().length <= MAX_PAYLOAD_LEN && inscription.chunks.length) {
      partial.chunks.push(inscription.chunks.shift())
      partial.chunks.push(inscription.chunks.shift())
    }

    if (partial.toBuffer().length > MAX_PAYLOAD_LEN) {
      inscription.chunks.unshift(partial.chunks.pop())
      inscription.chunks.unshift(partial.chunks.pop())
    }


    let lock = new Script()
    lock.chunks.push(bufferToChunk((publicKey as any).toBuffer()))
    lock.chunks.push(opcodeToChunk(Opcode.OP_CHECKSIGVERIFY))
    partial.chunks.forEach(() => {
      lock.chunks.push(opcodeToChunk(Opcode.OP_DROP))
    })
    lock.chunks.push(opcodeToChunk(Opcode.OP_TRUE))

    let lockhash = Hash.ripemd160(Hash.sha256(lock.toBuffer()))
    let p2sh = new Script()
    p2sh.chunks.push(opcodeToChunk(Opcode.OP_HASH160))
    p2sh.chunks.push(bufferToChunk(lockhash))
    p2sh.chunks.push(opcodeToChunk(Opcode.OP_EQUAL))

    let p2shOutput = new Transaction.Output({
      script: p2sh,
      satoshis: 100000
    })


    let tx = new Transaction();
    if (p2shInput) tx.addInput(p2shInput)
    tx.addOutput(p2shOutput)
    fund(wallet, tx)

    if (p2shInput) {
      let signature = Transaction.sighash.sign(tx, privateKey, Signature.SIGHASH_ALL, 0, lastLock)
      let txsignature = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])])

      let unlock = new Script()
      unlock.chunks = unlock.chunks.concat(lastPartial.chunks)
      unlock.chunks.push(bufferToChunk(txsignature))
      unlock.chunks.push(bufferToChunk(lastLock.toBuffer()))
      tx.inputs[0].setScript(unlock)
    }


    updateWallet(wallet, tx)
    txs.push(tx)

    p2shInput = new Transaction.Input({
      prevTxId: tx.hash,
      outputIndex: 0,
      output: tx.outputs[0],
      script: ''
    })

    p2shInput.clearSignatures = () => { }
    p2shInput.getSignatures = () => { }


    lastLock = lock
    lastPartial = partial

  }


  let tx = new Transaction()
  tx.addInput(p2shInput)
  tx.to(address, 100000)
  fund(wallet, tx)

  let signature = Transaction.sighash.sign(tx, privateKey, Signature.SIGHASH_ALL, 0, lastLock)
  let txsignature = Buffer.concat([signature.toBuffer(), Buffer.from([Signature.SIGHASH_ALL])])

  let unlock = new Script()
  unlock.chunks = unlock.chunks.concat(lastPartial.chunks)
  unlock.chunks.push(bufferToChunk(txsignature))
  unlock.chunks.push(bufferToChunk(lastLock.toBuffer()))
  tx.inputs[0].setScript(unlock)

  updateWallet(wallet, tx)
  txs.push(tx)


  return txs
}

export default App;
