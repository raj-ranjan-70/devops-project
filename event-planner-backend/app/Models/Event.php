<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'title', 'description', 'event_type', 'venue', 
        'event_date', 'duration', 'guest_count', 'budget', 'status', 'cover_image'
    ];

    /**
     * Get computed status dynamically based on current time, event date, and duration.
     */
    public function getStatusAttribute()
    {
        // If explicitly set to cancelled (e.g. by admin), respect it
        if (isset($this->attributes['status']) && $this->attributes['status'] === 'cancelled') {
            return 'cancelled';
        }

        $now = now();
        $eventStart = \Carbon\Carbon::parse($this->attributes['event_date']);
        
        $duration = $this->attributes['duration'] ?? 3;
        $eventEnd = (clone $eventStart)->addHours($duration);

        if ($now->lt($eventStart)) {
            return 'upcoming';
        } elseif ($now->between($eventStart, $eventEnd)) {
            return 'Live/Happening';
        } else {
            return 'completed';
        }
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function guests()
    {
        return $this->hasMany(Guest::class);
    }

    public function vendors()
    {
        return $this->hasMany(Vendor::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function timelines()
    {
        return $this->hasMany(Timeline::class);
    }

    public function budget()
    {
        return $this->hasOne(Budget::class);
    }
}
