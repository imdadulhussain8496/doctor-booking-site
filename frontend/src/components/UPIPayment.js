// D:\Projects\DoctorBooking\frontend\src\components\UPIPayment.js
import React, { useState } from 'react';
import './UPIPayment.css';

function UPIPayment({ doctor, amount, onPaymentComplete, onCancel }) {
    const [step, setStep] = useState('qr');
    const [transactionId, setTransactionId] = useState('');
    const [upiApp, setUpiApp] = useState('');

    const handlePaymentConfirm = () => {
        if (!transactionId) {
            alert('Please enter transaction ID');
            return;
        }
        setStep('processing');
        setTimeout(() => {
            onPaymentComplete({
                transactionId,
                upiApp,
                amount,
                doctor: doctor.name,
                timestamp: new Date().toISOString()
            });
        }, 2000);
    };

    const handleCopyUpiId = () => {
        navigator.clipboard.writeText(doctor.upiId);
        alert('✅ UPI ID copied to clipboard!');
    };

    const openUpiApp = (appName) => {
        // No need to store upiIntent variable - removed
        let appScheme = '';
        switch(appName) {
            case 'gpay':
                appScheme = 'tez://';
                break;
            case 'phonepe':
                appScheme = 'phonepe://';
                break;
            case 'paytm':
                appScheme = 'paytmmp://';
                break;
            default:
                alert('Please open your UPI app manually and scan the QR code');
                return;
        }
        
        window.location.href = appScheme;
        setTimeout(() => {
            alert('If app did not open, please scan QR code manually');
        }, 500);
    };

    return (
        <div className="upi-payment-container">
            <div className="upi-payment-header">
                <h2>💳 Pay via UPI</h2>
                <p>Complete your payment to confirm appointment</p>
            </div>

            {step === 'qr' && (
                <div className="upi-qr-step">
                    <div className="doctor-payment-info">
                        <div className="doctor-avatar">
                            <img 
                                src={doctor.image || 'https://via.placeholder.com/80x80/2563eb/ffffff?text=Dr'} 
                                alt={doctor.name}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/80x80/2563eb/ffffff?text=Dr';
                                }}
                            />
                        </div>
                        <div className="doctor-details">
                            <h3>{doctor.name}</h3>
                            <p className="specialization">{doctor.specialization}</p>
                            <p className="amount">Amount: <strong className="amount-value">₹{amount}</strong></p>
                        </div>
                    </div>

                    <div className="qr-section">
                        <h3>Scan QR Code</h3>
                        {doctor.qrCodeUrl ? (
                            <img 
                                src={doctor.qrCodeUrl} 
                                alt={`QR Code for ${doctor.name}`}
                                className="qr-code-image"
                            />
                        ) : (
                            <div className="qr-placeholder">
                                <span className="qr-icon">📱</span>
                                <p>QR Code will appear here</p>
                            </div>
                        )}
                        
                        <div className="upi-id-section">
                            <p className="upi-id-label">OR use UPI ID:</p>
                            <div className="upi-id-box">
                                <code>{doctor.upiId || 'doctor@okhdfcbank'}</code>
                                <button 
                                    className="copy-btn"
                                    onClick={handleCopyUpiId}
                                    title="Copy UPI ID"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </div>

                        <div className="quick-apps">
                            <p className="quick-apps-label">Quick pay with:</p>
                            <div className="app-buttons">
                                <button 
                                    className="app-btn gpay"
                                    onClick={() => openUpiApp('gpay')}
                                    title="Google Pay"
                                >
                                    <span className="app-icon">📱</span> GPay
                                </button>
                                <button 
                                    className="app-btn phonepe"
                                    onClick={() => openUpiApp('phonepe')}
                                    title="PhonePe"
                                >
                                    <span className="app-icon">📱</span> PhonePe
                                </button>
                                <button 
                                    className="app-btn paytm"
                                    onClick={() => openUpiApp('paytm')}
                                    title="Paytm"
                                >
                                    <span className="app-icon">📱</span> Paytm
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="payment-instructions">
                        <h4>📝 Instructions:</h4>
                        <div className="instruction-highlight">
                            <p>✅ <strong>Amount ₹{amount}</strong> will be AUTO-FILLED when you scan!</p>
                        </div>
                        <ol>
                            <li>Open any UPI app (Google Pay, PhonePe, Paytm)</li>
                            <li>Scan QR code or enter UPI ID manually</li>
                            <li><strong className="auto-fill-note">Amount ₹{amount} will be auto-filled</strong> - just click Pay!</li>
                            <li>Complete payment and copy transaction ID</li>
                        </ol>
                        <div className="tip-box">
                            <p>💡 <strong>Pro Tip:</strong> The QR code already has amount ₹{amount} included. You don't need to enter it manually!</p>
                        </div>
                    </div>

                    <div className="qr-actions">
                        <button className="secondary-btn" onClick={onCancel}>← Back</button>
                        <button className="primary-btn" onClick={() => setStep('confirm')}>I've Made Payment →</button>
                    </div>
                </div>
            )}

            {step === 'confirm' && (
                <div className="upi-confirm-step">
                    <h3>Confirm Payment</h3>
                    
                    <div className="payment-summary">
                        <div className="summary-row">
                            <span>Doctor:</span>
                            <strong>{doctor.name}</strong>
                        </div>
                        <div className="summary-row">
                            <span>Amount:</span>
                            <strong className="amount">₹{amount}</strong>
                        </div>
                        <div className="summary-row highlight">
                            <span>Auto-filled in QR:</span>
                            <strong className="success-text">✅ Yes</strong>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Select UPI App</label>
                        <select 
                            value={upiApp}
                            onChange={(e) => setUpiApp(e.target.value)}
                            className="upi-app-select"
                        >
                            <option value="">Select your UPI app</option>
                            <option value="gpay">Google Pay</option>
                            <option value="phonepe">PhonePe</option>
                            <option value="paytm">Paytm</option>
                            <option value="bhim">BHIM UPI</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Enter UPI Transaction ID</label>
                        <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="e.g., UPI123456789"
                            className="transaction-input"
                        />
                        <p className="input-hint">
                            Find transaction ID in your UPI app payment history
                        </p>
                    </div>

                    <div className="confirm-actions">
                        <button className="secondary-btn" onClick={() => setStep('qr')}>← Back</button>
                        <button className="payment-btn" onClick={handlePaymentConfirm} disabled={!transactionId}>
                            Confirm Payment
                        </button>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="upi-processing-step">
                    <div className="spinner"></div>
                    <h3>Verifying Payment</h3>
                    <p>Please wait while we confirm your payment...</p>
                    <p className="transaction-id">Transaction ID: {transactionId}</p>
                </div>
            )}

            <div className="commission-note">
                <p>ℹ️ 4% platform fee included in consultation amount (₹{Math.round(amount * 0.04)} to platform, ₹{Math.round(amount * 0.96)} to doctor)</p>
            </div>
        </div>
    );
}

export default UPIPayment;