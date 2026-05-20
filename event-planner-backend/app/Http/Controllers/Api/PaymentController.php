<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\ServiceBooking;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use App\Models\Budget;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Razorpay\Api\Api;
use Razorpay\Api\Utility;

class PaymentController extends Controller
{
    /**
     * Vendor requests a payment from a planner inside chat.
     */
    public function requestPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'service_booking_id' => 'required|exists:service_bookings,id',
            'amount' => 'nullable|numeric|min:1',
            'message' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $vendor = $request->user();
        if ($vendor->role !== 'vendor') {
            return response()->json(['message' => 'Only vendors can request payments.'], 403);
        }

        $booking = ServiceBooking::with(['event', 'vendorService'])
            ->findOrFail($request->service_booking_id);

        // Ensure this vendor owns the booking
        if ($booking->vendorService->user_id !== $vendor->id) {
            return response()->json(['message' => 'Unauthorized booking access.'], 403);
        }

        // Determine final billing amount
        $amount = $request->amount;
        if (is_null($amount) || $amount === '' || $amount === 0 || $amount === 0.0) {
            $amount = floatval($booking->vendorService->starting_price ?? 0);
        }

        if ($amount <= 0) {
            return response()->json(['amount' => ['A valid billing amount or service starting price is required.']], 422);
        }

        // Ensure no other pending payment request exists for this service booking
        $existingPending = Payment::where('service_booking_id', $booking->id)
            ->where('status', 'pending')
            ->first();

        if ($existingPending) {
            return response()->json([
                'message' => 'There is already an active pending payment request for this booking.'
            ], 400);
        }

        $plannerId = $booking->event->user_id;
        $eventId = $booking->event_id;

        DB::beginTransaction();
        try {
            // 1. Create the pending payment request record
            $payment = Payment::create([
                'service_booking_id' => $booking->id,
                'vendor_id' => $vendor->id,
                'planner_id' => $plannerId,
                'event_id' => $eventId,
                'amount' => $amount,
                'currency' => 'INR',
                'message' => $request->message,
                'status' => 'pending',
                'payment_source' => 'chat',
            ]);

            // 2. Create the system message of type 'payment_request' in the chat
            $chatMsg = Message::create([
                'sender_id' => $vendor->id,
                'receiver_id' => $plannerId,
                'message' => $request->message ?: "Payment request of ₹" . number_format($amount, 2) . " sent.",
                'type' => 'payment_request',
                'payment_id' => $payment->id,
                'is_read' => false,
            ]);

            // 3. Dispatch DB notification for the planner
            Notification::create([
                'user_id' => $plannerId,
                'title' => 'New Payment Request',
                'message' => 'Vendor ' . ($booking->vendorService->business_name ?: $vendor->name) . ' has requested a payment of ₹' . number_format($amount, 2) . ($request->message ? ': "' . $request->message . '"' : ''),
                'type' => 'payment',
                'is_read' => false,
                'payment_id' => $payment->id,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Payment request sent successfully.',
                'payment' => $payment->load(['vendor', 'planner', 'event']),
                'chat_message' => $chatMsg
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create payment request: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Planner triggers checkout: generates Razorpay Order ID.
     */
    public function createOrder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'payment_id' => 'required|exists:payments,id',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $planner = $request->user();
        $payment = Payment::findOrFail($request->payment_id);

        // Ensure this planner is authorized
        if ($payment->planner_id !== $planner->id) {
            return response()->json(['message' => 'Unauthorized payment access.'], 403);
        }

        if ($payment->status === 'paid') {
            return response()->json(['message' => 'This invoice is already paid.'], 400);
        }

        try {
            $keyId = config('services.razorpay.key_id');
            $keySecret = config('services.razorpay.key_secret');
            
            $api = new Api($keyId, $keySecret);

            // Amount in paise
            $amountInPaise = intval(round($payment->amount * 100));

            $order = $api->order->create([
                'receipt' => 'rcpt_' . $payment->id . '_' . time(),
                'amount' => $amountInPaise,
                'currency' => 'INR',
            ]);

            // Save order ID to the payment request
            $payment->update([
                'razorpay_order_id' => $order['id']
            ]);

            return response()->json([
                'key_id' => $keyId,
                'order_id' => $order['id'],
                'amount' => $order['amount'],
                'currency' => $order['currency'],
                'payment' => $payment
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Razorpay Order creation failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Verify Razorpay payment signature after successful frontend checkout.
     */
    public function verifyPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'payment_id' => 'required|exists:payments,id',
            'razorpay_payment_id' => 'required|string',
            'razorpay_order_id' => 'required|string',
            'razorpay_signature' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $planner = $request->user();
        $payment = Payment::with(['vendor', 'planner', 'serviceBooking.vendorService'])->findOrFail($request->payment_id);

        if ($payment->planner_id !== $planner->id) {
            return response()->json(['message' => 'Unauthorized transaction.'], 403);
        }

        if ($payment->status === 'paid') {
            return response()->json(['message' => 'This payment was already processed.', 'payment' => $payment], 200);
        }

        // Verify Razorpay signature securely
        try {
            $keyId = config('services.razorpay.key_id');
            $keySecret = config('services.razorpay.key_secret');
            
            $api = new Api($keyId, $keySecret);
            
            $attributes = [
                'razorpay_order_id' => $request->razorpay_order_id,
                'razorpay_payment_id' => $request->razorpay_payment_id,
                'razorpay_signature' => $request->razorpay_signature
            ];
            
            $api->utility->verifyPaymentSignature($attributes);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Razorpay verification error: ' . $e->getMessage());
            return response()->json(['message' => 'Payment verification failed: ' . $e->getMessage()], 400);
        }

        DB::beginTransaction();
        try {
            // Update payment record to PAID
            $payment->update([
                'razorpay_payment_id' => $request->razorpay_payment_id,
                'status' => 'paid',
                'payment_date' => now(),
                'gateway_response' => json_encode($request->all())
            ]);

            // ── Budget tracking ──────────────────────────────────────────────
            $eventId = $payment->event_id;
            $budget = Budget::where('event_id', $eventId)->first();
            if (!$budget && $eventId) {
                $event = Event::find($eventId);
                if ($event) {
                    $budget = Budget::create([
                        'event_id' => $eventId,
                        'total_budget' => floatval($event->getAttributes()['budget'] ?? 0),
                        'spent_amount' => 0.00
                    ]);
                }
            }

            if ($budget) {
                $budget->spent_amount = floatval($budget->spent_amount) + floatval($payment->amount);
                $budget->save();

                // Calculate remaining percentage
                $totalBudget = floatval($budget->total_budget);
                if ($totalBudget > 0) {
                    $remainingAmount   = $totalBudget - floatval($budget->spent_amount);
                    $remainingPct      = ($remainingAmount / $totalBudget) * 100;

                    $already60 = Notification::where('user_id', $payment->planner_id)
                        ->where('type', 'budget_alert_60_event_' . $eventId)
                        ->exists();

                    $already30 = Notification::where('user_id', $payment->planner_id)
                        ->where('type', 'budget_alert_30_event_' . $eventId)
                        ->exists();

                    if ($remainingPct < 60 && !$already60) {
                        Notification::create([
                            'user_id' => $payment->planner_id,
                            'title'   => '⚠️ Budget Alert: Below 60%',
                            'message' => 'Remaining budget for event #' . $eventId . ' has dropped below 60%. Remaining: ₹' . number_format($remainingAmount, 2) . ' (' . round($remainingPct, 1) . '% left).',
                            'type'    => 'budget_alert_60_event_' . $eventId,
                            'is_read' => false,
                        ]);
                    }

                    if ($remainingPct < 30 && !$already30) {
                        Notification::create([
                            'user_id' => $payment->planner_id,
                            'title'   => '🔴 Budget Alert: Below 30%',
                            'message' => 'Critical: Remaining budget for event #' . $eventId . ' has dropped below 30%. Remaining: ₹' . number_format($remainingAmount, 2) . ' (' . round($remainingPct, 1) . '% left).',
                            'type'    => 'budget_alert_30_event_' . $eventId,
                            'is_read' => false,
                        ]);
                    }
                }
            }
            // ────────────────────────────────────────────────────────────────

            // Create notification for vendor
            Notification::create([
                'user_id' => $payment->vendor_id,
                'title' => 'Payment Received!',
                'message' => 'Planner ' . $planner->name . ' paid ₹' . number_format($payment->amount, 2) . ' for booking #' . $payment->service_booking_id,
                'type' => 'payment',
                'is_read' => false,
            ]);

            // Create notification for planner
            Notification::create([
                'user_id' => $payment->planner_id,
                'title' => 'Payment Successful!',
                'message' => 'Your payment of ₹' . number_format($payment->amount, 2) . ' was processed successfully.',
                'type' => 'payment',
                'is_read' => false,
            ]);

            // Append verification success message into chat thread automatically
            Message::create([
                'sender_id' => $planner->id,
                'receiver_id' => $payment->vendor_id,
                'message' => "💸 Payment of ₹" . number_format($payment->amount, 2) . " completed successfully! (Payment ID: " . $request->razorpay_payment_id . ")",
                'type' => 'text',
                'is_read' => false,
            ]);

            // Append automated invoice message into chat thread automatically from vendor to planner
            Message::create([
                'sender_id' => $payment->vendor_id,
                'receiver_id' => $payment->planner_id,
                'message' => "📄 Invoice generated for " . ($payment->serviceBooking->vendorService->business_name ?? 'Vendor Service'),
                'type' => 'invoice',
                'payment_id' => $payment->id,
                'is_read' => false,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Payment verified and completed successfully.',
                'payment' => $payment
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to process completed payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get planner's payment dashboard metrics and history.
     */
    public function plannerHistory(Request $request)
    {
        $plannerId = $request->user()->id;

        $payments = Payment::where('planner_id', $plannerId)
            ->with(['vendor.vendor', 'serviceBooking.vendorService', 'event'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($payments);
    }

    /**
     * Get vendor's payment dashboard statistics and records.
     */
    public function vendorHistory(Request $request)
    {
        $vendorId = $request->user()->id;

        $payments = Payment::where('vendor_id', $vendorId)
            ->with(['planner', 'serviceBooking.vendorService', 'event'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Calculate Revenue metrics
        $totalEarnings = Payment::where('vendor_id', $vendorId)->where('status', 'paid')->sum('amount');
        $pendingEarnings = Payment::where('vendor_id', $vendorId)->where('status', 'pending')->sum('amount');
        $completedCount = Payment::where('vendor_id', $vendorId)->where('status', 'paid')->count();
        $pendingCount = Payment::where('vendor_id', $vendorId)->where('status', 'pending')->count();

        return response()->json([
            'payments' => $payments,
            'stats' => [
                'total_earnings' => floatval($totalEarnings),
                'pending_earnings' => floatval($pendingEarnings),
                'completed_count' => intval($completedCount),
                'pending_count' => intval($pendingCount),
            ]
        ]);
    }

    /**
     * Retrieve details for a single payment.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $payment = Payment::with(['vendor.vendor', 'planner', 'serviceBooking.vendorService', 'event'])
            ->findOrFail($id);

        if ($payment->vendor_id !== $user->id && $payment->planner_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return response()->json($payment);
    }

    /**
     * Mark a payment as failed during checkout.
     */
    public function failPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'payment_id' => 'required|exists:payments,id',
            'error_message' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $planner = $request->user();
        $payment = Payment::findOrFail($request->payment_id);

        if ($payment->planner_id !== $planner->id) {
            return response()->json(['message' => 'Unauthorized transaction.'], 403);
        }

        if ($payment->status === 'paid') {
            return response()->json(['message' => 'This payment is already paid.'], 400);
        }

        DB::beginTransaction();
        try {
            $payment->update([
                'status' => 'failed',
                'gateway_response' => json_encode([
                    'error' => $request->error_message ?: 'Payment failed during checkout.'
                ])
            ]);

            // Create notification for vendor
            Notification::create([
                'user_id' => $payment->vendor_id,
                'title' => 'Payment Failed',
                'message' => 'Payment request of ₹' . number_format($payment->amount, 2) . ' from Planner ' . $planner->name . ' has failed.',
                'type' => 'payment',
                'is_read' => false,
            ]);

            // Create notification for planner
            Notification::create([
                'user_id' => $payment->planner_id,
                'title' => 'Payment Failed',
                'message' => 'Your payment of ₹' . number_format($payment->amount, 2) . ' failed during checkout.',
                'type' => 'payment',
                'is_read' => false,
            ]);

            // Append verification failure message into chat thread automatically
            Message::create([
                'sender_id' => $planner->id,
                'receiver_id' => $payment->vendor_id,
                'message' => "❌ Payment of ₹" . number_format($payment->amount, 2) . " failed.",
                'type' => 'text',
                'is_read' => false,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Payment marked as failed successfully.',
                'payment' => $payment
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to process failed payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Razorpay Webhook failsafe endpoint.
     */
    public function handleWebhook(Request $request)
    {
        $webhookSecret = config('services.razorpay.webhook_secret');
        $signature = $request->header('X-Razorpay-Signature');

        if (!$signature) {
            return response()->json(['message' => 'Missing signature header.'], 400);
        }

        // Verify webhook signature (optional but recommended in production)
        if ($webhookSecret) {
            $expectedSignature = hash_hmac('sha256', $request->getContent(), $webhookSecret);
            if (!hash_equals($expectedSignature, $signature)) {
                return response()->json(['message' => 'Webhook signature mismatch.'], 400);
            }
        }

        $payload = $request->all();
        $event = $payload['event'] ?? '';

        if ($event === 'order.paid' || $event === 'payment.captured') {
            $orderId = $payload['payload']['payment']['entity']['order_id'] ?? null;
            $paymentId = $payload['payload']['payment']['entity']['id'] ?? null;

            if ($orderId) {
                $payment = Payment::with(['vendor', 'planner', 'serviceBooking.vendorService'])
                    ->where('razorpay_order_id', $orderId)
                    ->first();

                if ($payment && $payment->status !== 'paid') {
                    DB::beginTransaction();
                    try {
                        $payment->update([
                            'razorpay_payment_id' => $paymentId,
                            'status' => 'paid',
                            'payment_date' => now(),
                            'gateway_response' => json_encode($payload)
                        ]);

                        // ── Budget tracking (webhook failsafe) ──────────────
                        $eventId = $payment->event_id;
                        $budget = Budget::where('event_id', $eventId)->first();
                        if (!$budget && $eventId) {
                            $event = Event::find($eventId);
                            if ($event) {
                                $budget = Budget::create([
                                    'event_id' => $eventId,
                                    'total_budget' => floatval($event->getAttributes()['budget'] ?? 0),
                                    'spent_amount' => 0.00
                                ]);
                            }
                        }
                        if ($budget) {
                            $budget->spent_amount = floatval($budget->spent_amount) + floatval($payment->amount);
                            $budget->save();

                            $totalBudget = floatval($budget->total_budget);
                            if ($totalBudget > 0) {
                                $remainingAmount = $totalBudget - floatval($budget->spent_amount);
                                $remainingPct    = ($remainingAmount / $totalBudget) * 100;

                                $already60 = Notification::where('user_id', $payment->planner_id)
                                    ->where('type', 'budget_alert_60_event_' . $eventId)->exists();
                                $already30 = Notification::where('user_id', $payment->planner_id)
                                    ->where('type', 'budget_alert_30_event_' . $eventId)->exists();

                                if ($remainingPct < 60 && !$already60) {
                                    Notification::create([
                                        'user_id' => $payment->planner_id,
                                        'title'   => '⚠️ Budget Alert: Below 60%',
                                        'message' => 'Remaining budget for event #' . $eventId . ' has dropped below 60%. Remaining: ₹' . number_format($remainingAmount, 2) . ' (' . round($remainingPct, 1) . '% left).',
                                        'type'    => 'budget_alert_60_event_' . $eventId,
                                        'is_read' => false,
                                    ]);
                                }
                                if ($remainingPct < 30 && !$already30) {
                                    Notification::create([
                                        'user_id' => $payment->planner_id,
                                        'title'   => '🔴 Budget Alert: Below 30%',
                                        'message' => 'Critical: Remaining budget for event #' . $eventId . ' has dropped below 30%. Remaining: ₹' . number_format($remainingAmount, 2) . ' (' . round($remainingPct, 1) . '% left).',
                                        'type'    => 'budget_alert_30_event_' . $eventId,
                                        'is_read' => false,
                                    ]);
                                }
                            }
                        }
                        // ───────────────────────────────────────────────────

                        // Notifications
                        Notification::create([
                            'user_id' => $payment->vendor_id,
                            'title' => 'Payment Received (Webhook Failsafe)',
                            'message' => 'A payment of ₹' . number_format($payment->amount, 2) . ' was captured automatically.',
                            'type' => 'payment',
                            'is_read' => false,
                        ]);

                        Notification::create([
                            'user_id' => $payment->planner_id,
                            'title' => 'Payment Completed (Webhook Failsafe)',
                            'message' => 'Your order of ₹' . number_format($payment->amount, 2) . ' was updated successfully.',
                            'type' => 'payment',
                            'is_read' => false,
                        ]);

                        // Append verification success message into chat thread automatically
                        Message::create([
                            'sender_id' => $payment->planner_id,
                            'receiver_id' => $payment->vendor_id,
                            'message' => "💸 Payment of ₹" . number_format($payment->amount, 2) . " completed successfully! (Payment ID: " . $paymentId . ")",
                            'type' => 'text',
                            'is_read' => false,
                        ]);

                        // Append automated invoice message into chat thread automatically from vendor to planner
                        Message::create([
                            'sender_id' => $payment->vendor_id,
                            'receiver_id' => $payment->planner_id,
                            'message' => "📄 Invoice generated for " . ($payment->serviceBooking->vendorService->business_name ?? 'Vendor Service'),
                            'type' => 'invoice',
                            'payment_id' => $payment->id,
                            'is_read' => false,
                        ]);

                        DB::commit();
                    } catch (\Exception $e) {
                        DB::rollBack();
                        logger()->error('Failsafe Webhook database update failed: ' . $e->getMessage());
                    }
                }
            }
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * Download the invoice as a PDF.
     */
    public function downloadInvoice(Request $request, $id)
    {
        $user = $request->user();
        $payment = Payment::with(['vendor.vendor', 'planner', 'serviceBooking.vendorService', 'event'])
            ->findOrFail($id);

        if ($payment->vendor_id !== $user->id && $payment->planner_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if ($payment->status !== 'paid') {
            return response()->json(['message' => 'Invoice is only available for paid transactions.'], 400);
        }

        try {
            // Ensure payment_date is parsed properly
            $payment->payment_date = $payment->payment_date ? \Carbon\Carbon::parse($payment->payment_date) : null;
            
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('invoice', compact('payment'));
            return $pdf->download('INV-' . str_pad($payment->id, 6, '0', STR_PAD_LEFT) . '.pdf');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('PDF generation error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to generate PDF: ' . $e->getMessage()], 500);
        }
    }
}
