import { hex } from '@scure/base';
import type {
  UnisatProvider,
  OkxBitcoinProvider,
  LeatherProvider,
  PhantomBitcoinProvider,
} from '@arkade-os/wallet-providers';

// --- Logging ---

const logEl = document.getElementById('log')!;

function log(msg: string, type: 'info' | 'success' | 'error' = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.prepend(entry);
}

// --- Provider definitions ---

interface ProviderDef {
  name: string;
  detect: () => boolean;
  supportsBatch: boolean;
  connect: () => Promise<{ pubkeyHex: string; address: string }>;
}

const providers: ProviderDef[] = [
  {
    name: 'UniSat',
    detect: () => typeof window.unisat !== 'undefined',
    supportsBatch: true,
    async connect() {
      const unisat = window.unisat!;
      const accounts = await unisat.requestAccounts();
      const pubkeyHex = await unisat.getPublicKey();
      return { pubkeyHex, address: accounts[0] };
    },
  },
  {
    name: 'OKX',
    detect: () => typeof window.okxwallet?.bitcoin !== 'undefined',
    supportsBatch: true,
    async connect() {
      const okx = window.okxwallet!.bitcoin!;
      const { address, publicKey } = await okx.connect();
      return { pubkeyHex: publicKey, address };
    },
  },
  {
    name: 'Leather',
    detect: () => typeof window.LeatherProvider !== 'undefined',
    supportsBatch: false,
    async connect() {
      const leather = window.LeatherProvider!;
      const resp = await leather.request('getAddresses');
      const p2tr = resp.result?.addresses?.find(
        (a: any) => a.type === 'p2tr'
      );
      if (!p2tr) throw new Error('No p2tr address found in Leather wallet');
      return { pubkeyHex: p2tr.publicKey, address: p2tr.address };
    },
  },
  {
    name: 'Phantom',
    detect: () => typeof window.phantom?.bitcoin !== 'undefined',
    supportsBatch: false,
    async connect() {
      const phantom = window.phantom!.bitcoin!;
      const accounts = await phantom.requestAccounts();
      const p2tr = accounts.find((a) => a.addressType === 'p2tr');
      if (!p2tr) throw new Error('No p2tr account found in Phantom wallet');
      return { pubkeyHex: p2tr.publicKey, address: p2tr.address };
    },
  },
];

// --- Render UI ---

const providersEl = document.getElementById('providers')!;

for (const prov of providers) {
  const detected = prov.detect();
  const card = document.createElement('div');
  card.className = 'provider-card';
  card.innerHTML = `
    <h3>${prov.name}</h3>
    <div class="status ${detected ? 'detected' : ''}">${detected ? 'Detected' : 'Not installed'}</div>
    <div class="info" id="${prov.name}-info"></div>
    <div>
      <button id="${prov.name}-connect" ${!detected ? 'disabled' : ''}>Connect</button>
      <button id="${prov.name}-sign" disabled>Test Sign</button>
      ${prov.supportsBatch ? `<button id="${prov.name}-batch" disabled>Test Batch Sign</button>` : ''}
    </div>
  `;
  providersEl.appendChild(card);

  if (!detected) continue;

  const connectBtn = document.getElementById(`${prov.name}-connect`) as HTMLButtonElement;
  const signBtn = document.getElementById(`${prov.name}-sign`) as HTMLButtonElement;
  const batchBtn = prov.supportsBatch
    ? (document.getElementById(`${prov.name}-batch`) as HTMLButtonElement)
    : null;
  const infoEl = document.getElementById(`${prov.name}-info`)!;

  let connectedAddress = '';

  connectBtn.addEventListener('click', async () => {
    try {
      log(`[${prov.name}] Connecting...`);
      const { pubkeyHex, address } = await prov.connect();
      connectedAddress = address;
      infoEl.textContent = `Pubkey: ${pubkeyHex}\nAddress: ${address}`;
      signBtn.disabled = false;
      if (batchBtn) batchBtn.disabled = false;
      log(`[${prov.name}] Connected: ${address}`, 'success');
    } catch (err: any) {
      log(`[${prov.name}] Connect failed: ${err.message}`, 'error');
    }
  });

  signBtn.addEventListener('click', async () => {
    log(`[${prov.name}] Sign test — note: requires a real PSBT. This is a connection/API test.`);
    try {
      // We can't create a valid signable PSBT without UTXOs, so just test the API call
      // with an empty PSBT to verify the wallet responds (will error, but shows connectivity)
      if (prov.name === 'UniSat') {
        await window.unisat!.signPsbt('70736274ff01000a0000000000000000000000', {
          autoFinalized: false,
        });
      } else if (prov.name === 'OKX') {
        await window.okxwallet!.bitcoin!.signPsbt('70736274ff01000a0000000000000000000000', {
          autoFinalized: false,
        });
      } else if (prov.name === 'Leather') {
        await window.LeatherProvider!.request('signPsbt', {
          hex: '70736274ff01000a0000000000000000000000',
          signAtIndex: [0],
        });
      } else if (prov.name === 'Phantom') {
        const emptyPsbt = new Uint8Array([
          0x70, 0x73, 0x62, 0x74, 0xff, 0x01, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]);
        await window.phantom!.bitcoin!.signPSBT(emptyPsbt);
      }
      log(`[${prov.name}] Sign succeeded (unexpected with empty PSBT)`, 'success');
    } catch (err: any) {
      // Expected: wallets will reject an empty/invalid PSBT
      log(`[${prov.name}] Sign response: ${err.message}`, 'info');
    }
  });

  if (batchBtn) {
    batchBtn.addEventListener('click', async () => {
      log(`[${prov.name}] Batch sign test — testing signPsbts API call...`);
      try {
        const emptyPsbtHex = '70736274ff01000a0000000000000000000000';
        if (prov.name === 'UniSat') {
          await window.unisat!.signPsbts([emptyPsbtHex, emptyPsbtHex]);
        } else if (prov.name === 'OKX') {
          await window.okxwallet!.bitcoin!.signPsbts([emptyPsbtHex, emptyPsbtHex]);
        }
        log(`[${prov.name}] Batch sign succeeded (unexpected)`, 'success');
      } catch (err: any) {
        log(`[${prov.name}] Batch sign response: ${err.message}`, 'info');
      }
    });
  }
}

if (!providers.some((p) => p.detect())) {
  log('No wallet extensions detected. Install UniSat, OKX, Leather, or Phantom to test.', 'error');
} else {
  log(`Detected ${providers.filter((p) => p.detect()).length} wallet(s). Click Connect to start.`);
}
