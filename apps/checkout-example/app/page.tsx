"use client";

import { useState } from "react";
import { CheckoutModal } from "./components/CheckoutModal";

export default function HomePage() {
  const [showCheckout, setShowCheckout] = useState(false);

  return (
    <div className="coffee-page">
      <div className="coffee-container">
        <div className="coffee-icon">☕</div>
        <h1>Buy Me a Coffee</h1>
        <p>Support my work with Bitcoin Lightning</p>
        <button
          onClick={() => setShowCheckout(true)}
          className="coffee-button"
        >
          Buy Coffee - $1
        </button>
      </div>

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        amountSats={2100}
      />
    </div>
  );
}
