import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import './PaymentHistory.css';

const PaymentHistory = ({ doctorId, isAdmin = false }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalPaid: 0,
    totalTransactions: 0,
    pendingTotal: 0
  });

  const fetchPaymentHistory = useCallback(async () => {
    setLoading(true);
    try {
      let response;
      
      if (isAdmin) {
        response = await api.get('/api/admin/payment-history');
        
        if (response.data.success) {
          setPayments(response.data.payments || []);
          setSummary({
            totalPaid: response.data.totalCollected || 0,
            totalTransactions: response.data.count || 0,
            pendingTotal: 0
          });
        }
      } else {
        if (!doctorId) return;
        response = await api.get(`/api/doctor/payment-history/${doctorId}`);

        if (response.data.success) {
          setPayments(response.data.payments || []);
          setSummary({
            totalPaid: response.data.summary?.totalPaid || 0,
            totalTransactions: response.data.payments?.length || 0,
            pendingTotal: response.data.summary?.nextDue || 0
          });
        }
      }
    } catch (error) {
      console.error('❌ Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, doctorId]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  if (loading) {
    return (
      <div className="payment-history-loading">
        <div className="spinner-small"></div>
        <p>Loading payment history...</p>
      </div>
    );
  }

  return (
    <div className="payment-history">
      <div className="payment-history-header">
        <h2>{isAdmin ? '💰 All Doctors Payment History' : '💰 My Payment History'}</h2>
        <div className="payment-summary-cards">
          <div className="summary-card">
            <span className="summary-label">Total Paid</span>
            <span className="summary-value">₹{summary.totalPaid}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">Transactions</span>
            <span className="summary-value">{summary.totalTransactions}</span>
          </div>
          {!isAdmin && (
            <div className="summary-card">
              <span className="summary-label">Pending Due</span>
              <span className="summary-value">₹{summary.pendingTotal}</span>
            </div>
          )}
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="no-payments">
          <span className="no-payments-icon">💰</span>
          <h3>No Payment History</h3>
          <p>Commission payments will appear here</p>
        </div>
      ) : (
        <div className="payment-list">
          {isAdmin ? (
            payments.map((payment, idx) => (
              <div key={idx} className="payment-item">
                <div className="payment-date">
                  <span className="date-icon">📅</span>
                  <span className="date-text">{formatDate(payment.paidAt)}</span>
                </div>
                <div className="payment-details">
                  <div className="payment-amount">₹{payment.amount}</div>
                  <div className="payment-status status-badge-completed">✅ Paid</div>
                </div>
                <div className="payment-info">
                  <span className="info-label">Doctor:</span>
                  <span className="info-value">{payment.doctorName}</span>
                </div>
                <div className="payment-info">
                  <span className="info-label">Txn ID:</span>
                  <span className="info-value">{payment.transactionId}</span>
                </div>
              </div>
            ))
          ) : (
            payments.map((payment, idx) => (
              <div key={idx} className="payment-item">
                <div className="payment-date">
                  <span className="date-icon">📅</span>
                  <span className="date-text">{formatDate(payment.paidAt)}</span>
                </div>
                <div className="payment-details">
                  <div className="payment-amount">₹{payment.amount}</div>
                  <div className="payment-status status-badge-completed">✅ Paid</div>
                </div>
                <div className="payment-info">
                  <span className="info-label">Txn ID:</span>
                  <span className="info-value">{payment.transactionId}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;