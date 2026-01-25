"use client";

import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="container">
      <div className="success-container">
        <div className="success-icon">✓</div>
        <h1>Payment Successful!</h1>
        <p className="success-message">
          Thank you for your purchase. Your payment has been confirmed on the
          Lightning Network.
        </p>
        <div className="success-details">
          <p>
            Your transaction was processed instantly and securely using Bitcoin
            Lightning.
          </p>
        </div>
        <Link href="/" className="back-button">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
