import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// ──────────────────────────────────────────────
// Institutional Policy Configuration
// ──────────────────────────────────────────────
const FALLBACK_ANNUAL_FEE = 15000;
const GATE_THRESHOLD = 0.5; // 50 %

/**
 * usePaymentGate — DB-Driven 50% Payment Gate Hook
 *
 * Fetches real-time financial status for a student from:
 * 1. The top-level `payments` collection (total amount verified by Finance)
 * 2. The student's `transactions` sub-collection (total fees charged as debits)
 */
export function usePaymentGate(uid) {
    const [state, setState] = useState({
        hasAccess: false,
        percentPaid: 0,
        amountPaid: 0,
        totalFees: FALLBACK_ANNUAL_FEE,
        amountRequired: FALLBACK_ANNUAL_FEE * GATE_THRESHOLD,
        loading: true,
    });

    useEffect(() => {
        if (!uid) {
            setState(s => ({ ...s, loading: false }));
            return;
        }

        // State trackers for the two listeners
        let totalPaid = 0;
        let totalFees = 0;
        let paymentsLoaded = false;
        let txLoaded = false;

        const updateState = (paid, fees) => {
            const actualFees = fees || FALLBACK_ANNUAL_FEE;
            const thresholdAmt = actualFees * GATE_THRESHOLD;
            const percent = (paid / actualFees) * 100;
            const hasAccess = paid >= thresholdAmt;

            setState({
                hasAccess,
                percentPaid: Math.min(percent, 100),
                amountPaid: paid,
                totalFees: actualFees,
                amountRequired: thresholdAmt,
                loading: !(paymentsLoaded && txLoaded),
            });
        };

        // 1. Listen for Verified Payments (Actual cash paid)
        const qPay = query(
            collection(db, 'payments'),
            where('studentUid', '==', uid),
            where('status', '==', 'Verified')
        );

        const unsubPay = onSnapshot(qPay, (snap) => {
            totalPaid = snap.docs.reduce((acc, d) => {
                const amt = d.data().amount;
                return acc + (typeof amt === 'number' ? amt : parseFloat(amt || 0));
            }, 0);
            paymentsLoaded = true;
            updateState(totalPaid, totalFees);
        }, (err) => {
            console.error('PayGate (Payments) error:', err);
            paymentsLoaded = true;
            updateState(totalPaid, totalFees);
        });

        // 2. Listen for Transactions (Total fees due — all 'debit' entries)
        const qTx = collection(db, 'students', uid, 'transactions');

        const unsubTx = onSnapshot(qTx, (snap) => {
            totalFees = snap.docs.reduce((acc, d) => {
                const data = d.data();
                if (data.type === 'debit') {
                    const amt = data.amount;
                    return acc + (typeof amt === 'number' ? amt : parseFloat(amt || 0));
                }
                return acc;
            }, 0);
            txLoaded = true;
            updateState(totalPaid, totalFees);
        }, (err) => {
            console.error('PayGate (Transactions) error:', err);
            txLoaded = true;
            updateState(totalPaid, totalFees);
        });

        return () => {
            unsubPay();
            unsubTx();
        };
    }, [uid]);

    return state;
}

export { FALLBACK_ANNUAL_FEE, GATE_THRESHOLD };
