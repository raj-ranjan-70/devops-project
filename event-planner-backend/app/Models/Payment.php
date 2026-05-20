<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = [
        'service_booking_id',
        'vendor_id',
        'planner_id',
        'event_id',
        'razorpay_order_id',
        'razorpay_payment_id',
        'currency',
        'amount',
        'message',
        'status',
        'payment_source',
        'payment_date',
        'gateway_response'
    ];

    protected $casts = [
        'payment_date' => 'datetime',
        'gateway_response' => 'array',
        'amount' => 'decimal:2',
    ];

    /**
     * Relationship to the service booking.
     */
    public function serviceBooking()
    {
        return $this->belongsTo(ServiceBooking::class);
    }

    /**
     * Relationship to the vendor who requested the payment.
     */
    public function vendor()
    {
        return $this->belongsTo(User::class, 'vendor_id');
    }

    /**
     * Relationship to the planner who is billed for the payment.
     */
    public function planner()
    {
        return $this->belongsTo(User::class, 'planner_id');
    }

    /**
     * Relationship to the wedding event.
     */
    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
