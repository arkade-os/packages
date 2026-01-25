"use client";

import { useState, useEffect } from "react";

interface WalletData {
  address: string;
  balance: {
    total: number;
    available: number;
    settled: number;
    preconfirmed: number;
    recoverable: number;
    boarding: {
      total: number;
    };
  };
}

interface Transaction {
  txid: string;
  amount: number;
  type: string;
  timestamp: number;
}

export default function AdminDashboard() {
  const [privateKey, setPrivateKey] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [payoutAddress, setPayoutAddress] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadWallet = async () => {
    if (!privateKey) {
      setMessage("Please enter a private key");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/arkade/admin/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privateKeyHex: privateKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load wallet");
      }

      setWalletData(data.wallet);
      setHistory(data.history || []);
      setIsLoaded(true);
      setMessage("Wallet loaded successfully");
    } catch (error) {
      setMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async () => {
    if (!payoutAddress || !payoutAmount) {
      setMessage("Please enter address and amount");
      return;
    }

    setPayoutLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/arkade/admin/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privateKeyHex: privateKey,
          address: payoutAddress,
          amount: parseInt(payoutAmount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payout failed");
      }

      setMessage(`Payout successful! TXID: ${data.txid}`);
      setPayoutAddress("");
      setPayoutAmount("");

      // Reload wallet data
      await loadWallet();
    } catch (error) {
      setMessage(
        `Payout error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setPayoutLoading(false);
    }
  };

  const formatSats = (sats: number) => {
    return sats.toLocaleString() + " sats";
  };

  const formatBTC = (sats: number) => {
    return (sats / 100_000_000).toFixed(8) + " BTC";
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Arkade Checkout Admin Dashboard</h1>

      {!isLoaded ? (
        <div style={{ marginTop: "2rem" }}>
          <h2>Load Wallet</h2>
          <div style={{ marginBottom: "1rem" }}>
            <label>
              Private Key (hex):
              <br />
              <input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter private key hex"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.5rem",
                  fontFamily: "monospace",
                }}
              />
            </label>
          </div>
          <button
            onClick={loadWallet}
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Loading..." : "Load Wallet"}
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1rem",
              marginTop: "2rem",
            }}
          >
            <div
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <h3>Address</h3>
              <p style={{ fontSize: "0.9rem", wordBreak: "break-all" }}>
                {walletData?.address}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <h3>Total Balance</h3>
              <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                {formatSats(walletData?.balance.total || 0)}
              </p>
              <p style={{ fontSize: "0.9rem", color: "#666" }}>
                {formatBTC(walletData?.balance.total || 0)}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <h3>Available</h3>
              <p style={{ fontSize: "1.2rem" }}>
                {formatSats(walletData?.balance.available || 0)}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <h3>Settled</h3>
              <p style={{ fontSize: "1.2rem" }}>
                {formatSats(walletData?.balance.settled || 0)}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <h3>Preconfirmed</h3>
              <p style={{ fontSize: "1.2rem" }}>
                {formatSats(walletData?.balance.preconfirmed || 0)}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <h3>Boarding</h3>
              <p style={{ fontSize: "1.2rem" }}>
                {formatSats(walletData?.balance.boarding.total || 0)}
              </p>
            </div>

            <div
              style={{
                border: "1px solid #ddd",
                padding: "1rem",
                borderRadius: "8px",
              }}
            >
              <h3>Recoverable</h3>
              <p style={{ fontSize: "1.2rem" }}>
                {formatSats(walletData?.balance.recoverable || 0)}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h2>Payout to Arkade Address</h2>
            <div
              style={{
                border: "1px solid #ddd",
                padding: "1.5rem",
                borderRadius: "8px",
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <label>
                  Destination Address:
                  <br />
                  <input
                    type="text"
                    value={payoutAddress}
                    onChange={(e) => setPayoutAddress(e.target.value)}
                    placeholder="ark1..."
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      marginTop: "0.5rem",
                      fontFamily: "monospace",
                    }}
                  />
                </label>
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label>
                  Amount (sats):
                  <br />
                  <input
                    type="number"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="400"
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      marginTop: "0.5rem",
                    }}
                  />
                </label>
              </div>
              <button
                onClick={handlePayout}
                disabled={payoutLoading}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  cursor: payoutLoading ? "not-allowed" : "pointer",
                  backgroundColor: "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                {payoutLoading ? "Processing..." : "Send Payout"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h2>Transaction History</h2>
            {history.length === 0 ? (
              <p>No transactions found</p>
            ) : (
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <table
                  style={{ width: "100%", borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f5f5f5" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left" }}>
                        TXID
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "left" }}>
                        Type
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "right" }}>
                        Amount
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "left" }}>
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx, i) => (
                      <tr
                        key={i}
                        style={{
                          borderTop: "1px solid #eee",
                        }}
                      >
                        <td
                          style={{
                            padding: "0.75rem",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                          }}
                        >
                          {tx.txid.slice(0, 8)}...{tx.txid.slice(-8)}
                        </td>
                        <td style={{ padding: "0.75rem" }}>{tx.type}</td>
                        <td
                          style={{
                            padding: "0.75rem",
                            textAlign: "right",
                          }}
                        >
                          {formatSats(tx.amount)}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setIsLoaded(false);
              setWalletData(null);
              setHistory([]);
              setPrivateKey("");
            }}
            style={{
              marginTop: "2rem",
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
            }}
          >
            Unload Wallet
          </button>
        </>
      )}

      {message && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: message.includes("Error")
              ? "#fee"
              : "#efe",
            border: `1px solid ${message.includes("Error") ? "#fcc" : "#cfc"}`,
            borderRadius: "4px",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
