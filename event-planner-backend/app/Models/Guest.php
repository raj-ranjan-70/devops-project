<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Guest extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id', 'name', 'email', 'phone', 'rsvp_status', 'side', 'notes',
        'rsvp_token', 'rsvp_responded_at', 'rsvp_message'
    ];

    protected $casts = [
        'rsvp_responded_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($guest) {
            if (empty($guest->rsvp_token)) {
                $guest->rsvp_token = bin2hex(random_bytes(20));
            }
        });
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
