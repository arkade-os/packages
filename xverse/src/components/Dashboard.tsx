import React, { useEffect, useState } from 'react';
import { useXverse } from './XverseProvider';

export const Dashboard: React.FC = () => {
  const {
    walletInfo,
    balance,
    isLoading,
    error,
    getBalance,
    sendBitcoin,
    onboardFunds,
    payLightningInvoice,
    createLightningInvoice,
    currentNetwork,
  } = useXverse();

  const [sendAddress, setSendAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [lightningInvoice, setLightningInvoice] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('');
  const [createdInvoice, setCreatedInvoice] = useState('');

  // Auto-refresh balance every 10 seconds
  useEffect(() => {
    if (walletInfo) {
      const interval = setInterval(() => {
        getBalance().catch(console.error);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [walletInfo, getBalance]);

  const handleSend = async () => {
    try {
      const amount = parseInt(sendAmount);
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const txid = await sendBitcoin(sendAddress, amount);
      alert(`Transaction sent! TXID: ${txid}`);
      setSendAddress('');
      setSendAmount('');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleOnboard = async () => {
    try {
      const txid = await onboardFunds();
      alert(`Funds onboarded! TXID: ${txid}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handlePayInvoice = async () => {
    try {
      const preimage = await payLightningInvoice(lightningInvoice);
      alert(`Invoice paid! Preimage: ${preimage}`);
      setLightningInvoice('');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const amount = parseInt(receiveAmount);
      if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      const invoice = await createLightningInvoice(amount, 'Arkade payment');
      setCreatedInvoice(invoice);
      alert(`Invoice created! It will auto-claim when paid.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatSats = (sats: number) => {
    return sats.toLocaleString() + ' sats';
  };

  if (!walletInfo) {
    return null;
  }

  return (
    <div style={styles.dashboard}>
      <div style={styles.header}>
        <h2>Arkade Wallet Dashboard</h2>
        <div style={styles.networkBadge}>
          Network: {currentNetwork}
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {/* Wallet Info */}
      <div style={styles.section}>
        <h3>Wallet Information</h3>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <strong>Ark Address:</strong>
            <code style={styles.code}>{walletInfo.arkAddress}</code>
          </div>
          <div style={styles.infoItem}>
            <strong>Boarding Address:</strong>
            <code style={styles.code}>{walletInfo.boardingAddress}</code>
          </div>
          <div style={styles.infoItem}>
            <strong>Payment Address:</strong>
            <code style={styles.code}>{walletInfo.paymentAddress}</code>
          </div>
          {walletInfo.ordinalsAddress && (
            <div style={styles.infoItem}>
              <strong>Ordinals Address:</strong>
              <code style={styles.code}>{walletInfo.ordinalsAddress}</code>
            </div>
          )}
        </div>
      </div>

      {/* Balance */}
      <div style={styles.section}>
        <div style={styles.balanceHeader}>
          <h3>Balance</h3>
          <button onClick={getBalance} disabled={isLoading} style={styles.button}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {balance && (
          <div style={styles.balanceGrid}>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>Total</div>
              <div style={styles.balanceValue}>{formatSats(balance.total)}</div>
            </div>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>On-chain</div>
              <div style={styles.balanceValue}>{formatSats(balance.onchain)}</div>
            </div>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>Off-chain (VTXOs)</div>
              <div style={styles.balanceValue}>{formatSats(balance.offchain)}</div>
            </div>
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>Settled</div>
              <div style={styles.balanceValue}>{formatSats(balance.settled)}</div>
            </div>
          </div>
        )}

        {balance && balance.onchain > 0 && (
          <div style={styles.onboardSection}>
            <p>You have {formatSats(balance.onchain)} in your boarding address.</p>
            <button onClick={handleOnboard} disabled={isLoading} style={styles.button}>
              {isLoading ? 'Onboarding...' : 'Onboard Funds to VTXOs'}
            </button>
          </div>
        )}
      </div>

      {/* Send Bitcoin */}
      <div style={styles.section}>
        <h3>Send Bitcoin</h3>
        <div style={styles.form}>
          <input
            type="text"
            placeholder="Recipient address"
            value={sendAddress}
            onChange={(e) => setSendAddress(e.target.value)}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Amount (sats)"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            style={styles.input}
          />
          <button onClick={handleSend} disabled={isLoading} style={styles.button}>
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Lightning Network */}
      {currentNetwork === 'bitcoin' && (
        <>
          <div style={styles.section}>
            <h3>Pay Lightning Invoice</h3>
            <div style={styles.form}>
              <input
                type="text"
                placeholder="Lightning invoice (lnbc...)"
                value={lightningInvoice}
                onChange={(e) => setLightningInvoice(e.target.value)}
                style={styles.input}
              />
              <button onClick={handlePayInvoice} disabled={isLoading} style={styles.button}>
                {isLoading ? 'Paying...' : 'Pay Invoice'}
              </button>
            </div>
          </div>

          <div style={styles.section}>
            <h3>Create Lightning Invoice</h3>
            <div style={styles.form}>
              <input
                type="number"
                placeholder="Amount (sats)"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                style={styles.input}
              />
              <button onClick={handleCreateInvoice} disabled={isLoading} style={styles.button}>
                {isLoading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
            {createdInvoice && (
              <div style={styles.invoiceResult}>
                <strong>Created Invoice:</strong>
                <code style={styles.code}>{createdInvoice}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdInvoice);
                    alert('Invoice copied to clipboard!');
                  }}
                  style={styles.button}
                >
                  Copy
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* VTXOs */}
      {balance && balance.vtxoList.length > 0 && (
        <div style={styles.section}>
          <h3>VTXOs ({balance.vtxoList.length})</h3>
          <div style={styles.vtxoList}>
            {balance.vtxoList.map((vtxo) => (
              <div key={vtxo.id} style={styles.vtxoCard}>
                <div>
                  <strong>{formatSats(vtxo.amount)}</strong>
                  <span style={styles.statusBadge}>{vtxo.status}</span>
                </div>
                <div style={styles.vtxoId}>
                  {vtxo.id.substring(0, 16)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Inline styles for simplicity
const styles = {
  dashboard: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  networkBadge: {
    padding: '8px 16px',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c00',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  section: {
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  infoGrid: {
    display: 'grid',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  code: {
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '12px',
    wordBreak: 'break-all' as const,
    fontFamily: 'monospace',
  },
  balanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  balanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  balanceCard: {
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  balanceLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  balanceValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#000',
  },
  onboardSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#fff3cd',
    borderRadius: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  invoiceResult: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  vtxoList: {
    display: 'grid',
    gap: '8px',
  },
  vtxoCard: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    marginLeft: '8px',
    padding: '2px 8px',
    backgroundColor: '#28a745',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '12px',
  },
  vtxoId: {
    fontSize: '12px',
    color: '#666',
    fontFamily: 'monospace',
  },
};
