"use client";

import { Checkout } from "@arkade-os/checkout";
import { use } from "react";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="checkout-container">
      <Checkout id={id} />
    </div>
  );
}
