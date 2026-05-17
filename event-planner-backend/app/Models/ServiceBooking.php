<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceBooking extends Model
{
    protected $fillable = [
        'event_id', 'vendor_service_id', 'message', 'status'
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function vendorService()
    {
        return $this->belongsTo(VendorService::class);
    }
}
