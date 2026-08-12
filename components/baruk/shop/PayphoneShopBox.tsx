"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

declare global {
    interface Window {
        PPaymentButtonBox?: any;
    }
}

type Props = {
    amount: number;
    refId: string;
};

export default function PayphoneShopBox({
    amount,
    refId,
}: Props) {
    const [ready, setReady] = useState(false);

    const token =
        process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ?? "";

    const storeId =
        process.env.NEXT_PUBLIC_PAYPHONE_STORE_ID ?? "";

    useEffect(() => {
        if (!ready) return;
        if (!window.PPaymentButtonBox) return;
        if (!token || !storeId) return;

        const container =
            document.getElementById(
                "payphone-shop-btn"
            );

        if (!container) return;

        container.innerHTML = "";

        try {
            const box =
                new window.PPaymentButtonBox({
                    token,
                    storeId,

                    amount,
                    amountWithoutTax: amount,

                    currency: "USD",

                    clientTransactionId:
                        refId,

                    reference:
                        `Baruk Shop ${refId}`,
                });

            box.render(
                "payphone-shop-btn"
            );
        } catch (error) {
            console.error(
                "PayPhone Shop:",
                error
            );
        }
    }, [
        ready,
        token,
        storeId,
        amount,
        refId,
    ]);

    if (!token) {
        return (
            <p className="mt-4 text-sm font-semibold text-red-500">
                Falta NEXT_PUBLIC_PAYPHONE_TOKEN.
            </p>
        );
    }

    if (!storeId) {
        return (
            <p className="mt-4 text-sm font-semibold text-red-500">
                Falta NEXT_PUBLIC_PAYPHONE_STORE_ID.
            </p>
        );
    }

    return (
        <>
            <Script
                id="payphone-shop-sdk"
                type="module"
                src="https://cdn.payphonetodoesposible.com/box/v1.1/payphone-payment-box.js"
                strategy="afterInteractive"
                onReady={() =>
                    setReady(true)
                }
            />

            <div
                id="payphone-shop-btn"
                className="mt-5 min-h-[60px]"
            />
        </>
    );
}