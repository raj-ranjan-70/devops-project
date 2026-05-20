<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Invoice - Aura Events</title>
    <style>
        body {
            font-family: 'DejaVu Sans', sans-serif;
            color: #333;
            line-height: 1.4;
            padding: 30px;
            margin: 0;
            background-color: #fff;
        }
        .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #f1f1f1;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
        }
        .header {
            border-bottom: 2px solid #ec4899;
            padding-bottom: 20px;
            margin-bottom: 25px;
        }
        .header table {
            width: 100%;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #ec4899;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .title {
            text-align: right;
            font-size: 22px;
            font-weight: 300;
            color: #555;
        }
        .details-table {
            width: 100%;
            margin-bottom: 25px;
        }
        .details-table td {
            width: 50%;
            vertical-align: top;
            font-size: 13px;
        }
        .details-heading {
            font-weight: bold;
            color: #555;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .info-value {
            color: #777;
        }
        .transaction-meta {
            background-color: #fafafa;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 30px;
            border: 1px solid #f3f4f6;
        }
        .transaction-meta table {
            width: 100%;
            font-size: 12px;
        }
        .transaction-meta td {
            padding: 4px 0;
        }
        .transaction-meta .label {
            font-weight: bold;
            color: #6b7280;
        }
        .transaction-meta .value {
            text-align: right;
            font-family: monospace;
            color: #111827;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th {
            background-color: #ec4899;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            text-align: left;
        }
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            font-size: 13px;
        }
        .items-table .amount-col {
            text-align: right;
        }
        .summary-table {
            width: 100%;
            margin-top: 15px;
        }
        .summary-table td {
            text-align: right;
            font-size: 13px;
            padding: 6px 12px;
        }
        .summary-table .total-row td {
            font-size: 18px;
            font-weight: bold;
            color: #ec4899;
            border-top: 2px solid #ec4899;
            padding-top: 12px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
            padding-top: 20px;
        }
    </style>
</head>
<body>

<div class="invoice-box">
    <!-- Header -->
    <div class="header">
        <table>
            <tr>
                <td class="logo">Aura Events</td>
                <td class="title">INVOICE</td>
            </tr>
        </table>
    </div>

    <!-- Client / Vendor Details -->
    <table class="details-table">
        <tr>
            <td>
                <div class="details-heading">Billed To (Planner)</div>
                <div><strong>{{ $payment->planner->name }}</strong></div>
                <div class="info-value">{{ $payment->planner->email }}</div>
            </td>
            <td>
                <div class="details-heading">Issued By (Vendor)</div>
                <div><strong>{{ $payment->serviceBooking->vendorService->business_name ?? $payment->vendor->name }}</strong></div>
                <div class="info-value">Service: {{ $payment->serviceBooking->vendorService->business_name ?? 'Professional Vendor' }}</div>
            </td>
        </tr>
    </table>

    <!-- Event & Metadata Details -->
    <table class="details-table" style="margin-bottom: 15px;">
        <tr>
            <td>
                <div class="details-heading">Event Details</div>
                <div><strong>{{ $payment->event->title ?? 'Event Masterpiece' }}</strong></div>
                <div class="info-value">Type: {{ ucfirst($payment->event->event_type ?? 'Wedding') }}</div>
                <div class="info-value">Venue: {{ $payment->event->venue ?? 'No Venue Set' }}</div>
            </td>
            <td>
                <div class="details-heading">Invoice Details</div>
                <div class="info-value">Invoice No: INV-{{ str_pad($payment->id, 6, '0', STR_PAD_LEFT) }}</div>
                <div class="info-value">Date: {{ $payment->payment_date ? $payment->payment_date->setTimezone('Asia/Kolkata')->format('d M Y, h:i A') : now()->setTimezone('Asia/Kolkata')->format('d M Y, h:i A') }}</div>
                <div class="info-value">Status: <span style="color: #10b981; font-weight: bold; text-transform: uppercase;">{{ $payment->status }}</span></div>
            </td>
        </tr>
    </table>

    <!-- Transaction metadata -->
    <div class="transaction-meta">
        <table>
            <tr>
                <td class="label">Razorpay Order ID</td>
                <td class="value">{{ $payment->razorpay_order_id }}</td>
            </tr>
            @if($payment->razorpay_payment_id)
            <tr>
                <td class="label">Razorpay Payment ID</td>
                <td class="value">{{ $payment->razorpay_payment_id }}</td>
            </tr>
            @endif
            <tr>
                <td class="label">Payment Source</td>
                <td class="value" style="text-transform: uppercase;">{{ $payment->payment_source }}</td>
            </tr>
        </table>
    </div>

    <!-- Bill Items -->
    <table class="items-table">
        <thead>
            <tr>
                <th>Item / Description</th>
                <th class="amount-col" style="width: 150px;">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <strong>{{ $payment->serviceBooking->vendorService->business_name ?? 'Vendor Service' }}</strong>
                    <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                        Professional services delivered for your event. Includes commission fees and taxes.
                    </div>
                </td>
                <td class="amount-col">
                    &#8377;{{ number_format($payment->amount, 2) }}
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Summary -->
    <table class="summary-table">
        <tr>
            <td style="width: 75%; color: #6b7280;">Subtotal:</td>
            <td>&#8377;{{ number_format($payment->amount, 2) }}</td>
        </tr>
        <tr>
            <td style="color: #6b7280;">Platform Processing Fee:</td>
            <td>&#8377;0.00</td>
        </tr>
        <tr class="total-row">
            <td>Total Paid:</td>
            <td>&#8377;{{ number_format($payment->amount, 2) }}</td>
        </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
        Thank you for planning your masterpiece with Aura Events. If you have questions regarding this payment, please contact the administrator.
        <br>
        <span style="font-style: italic;">Aura Events Platform • Securely Verified Transaction</span>
    </div>
</div>

</body>
</html>
