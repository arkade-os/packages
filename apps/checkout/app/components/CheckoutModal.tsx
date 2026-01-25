"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { debug } from "../lib/log";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountSats: number;
}

export function CheckoutModal({ isOpen, onClose, amountSats }: CheckoutModalProps) {
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<any>(null);
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState<"creating" | "pending" | "paid" | "expired">("creating");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !checkoutId) {
      createCheckout();
    }

    // Set up webhook for when user closes the page
    const handleBeforeUnload = () => {
      if (checkoutId && status === "pending") {
        // Send webhook to keep claim process alive
        navigator.sendBeacon(
          "/api/arkade/webhook",
          JSON.stringify({
            checkoutId,
            event: "page_closed",
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isOpen, checkoutId, status]);

  async function createCheckout() {
    try {
      setStatus("creating");
      setError(null);

      const res = await fetch("/api/arkade/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Coffee",
          description: "Thanks for your support!",
          amountSats: amountSats,
          metadata: {},
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create checkout");
      }

      const data = await res.json();
      setCheckoutId(data.checkoutId);
      loadCheckout(data.checkoutId);
    } catch (err) {
      console.error("Checkout creation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create checkout");
      setStatus("pending");
    }
  }

  async function loadCheckout(id: string) {
    const res = await fetch(`/api/arkade/status?id=${id}`);
    const data = await res.json();
    setCheckout(data);
    setStatus("pending");

    const qr = await QRCode.toDataURL(data.invoice.toUpperCase(), {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
    setQrCode(qr);

    claimPayment(id);
    pollStatus(id);
  }

  async function claimPayment(id: string) {
    try {
      debug('[checkout] Starting claim for:', id);
      const res = await fetch("/api/arkade/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: id }),
      });
      const data = await res.json();
      debug('[checkout] Claim response:', res.status, data);
      if (!res.ok) {
        console.error('[checkout] Claim failed:', data.error);
      }
    } catch (err) {
      console.error('[checkout] Claim error:', err);
    }
  }

  function pollStatus(id: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/arkade/status?id=${id}`);
      const data = await res.json();

      if (data.status === "paid") {
        setStatus("paid");
        clearInterval(interval);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else if (data.status === "expired") {
        setStatus("expired");
        clearInterval(interval);
      }
    }, 3000);

    setTimeout(() => clearInterval(interval), 600000);
  }

  function handleClose() {
    setCheckoutId(null);
    setCheckout(null);
    setQrCode("");
    setStatus("creating");
    setError(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose} />
      <div className="modal-content">
        <button className="modal-close" onClick={handleClose}>×</button>

        {error && (
          <div className="modal-error">
            <p>{error}</p>
            <button onClick={createCheckout} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {status === "creating" && (
          <div className="modal-loading">
            <div className="spinner" />
            <p>Creating checkout...</p>
          </div>
        )}

        {status === "pending" && checkout && (
          <div className="modal-checkout">
            <h2>{checkout.title}</h2>
            <p className="modal-description">{checkout.description}</p>
            <div className="modal-amount">{amountSats.toLocaleString()} sats</div>

            <div className="modal-qr">
              <img src={qrCode} alt="Lightning Invoice QR Code" />
            </div>

            <div className="modal-invoice">
              <input value={checkout.invoice} readOnly />
              <button onClick={() => navigator.clipboard.writeText(checkout.invoice)}>
                Copy
              </button>
            </div>

            {checkout.pendingSwap?.id && (
              <div className="modal-debug">
                <span>Swap ID</span>
                <span className="modal-debug-value">{checkout.pendingSwap.id}</span>
              </div>
            )}

            <div className="modal-status">
              <div className="pulse-dot" />
              Waiting for payment...
            </div>
          </div>
        )}

        {status === "paid" && (
          <div className="modal-success">
            <div className="success-checkmark">✓</div>
            <h2>Payment Confirmed!</h2>
            <p>Thank you for your support</p>
          </div>
        )}

        {status === "expired" && (
          <div className="modal-expired">
            <h2>Invoice Expired</h2>
            <p>Please try again</p>
            <button onClick={createCheckout} className="retry-button">
              Create New Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
