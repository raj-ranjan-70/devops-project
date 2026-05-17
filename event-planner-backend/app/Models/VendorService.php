<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorService extends Model
{
    protected $fillable = [
        'user_id', 'business_name', 'category', 'description', 
        'starting_price', 'location', 'rating', 'image_url', 'is_available'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bookings()
    {
        return $this->hasMany(ServiceBooking::class);
    }
}
