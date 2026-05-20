<?php

namespace App\Services;

use App\Models\Event;
use Illuminate\Support\Facades\Storage;

class EventService
{
    public function getAllEvents($userId)
    {
        return Event::where('user_id', $userId)
            ->with(['budget', 'guests', 'vendors'])
            ->orderBy('event_date', 'desc')
            ->get()
            ->map(function ($event) {
                $data = $event->toArray();
                // Expose the raw budget column amount separately to avoid
                // collision with the 'budget' relation key in the JSON
                $data['budget_amount'] = $event->getAttributes()['budget'] ?? 0;
                return $data;
            });
    }

    public function createEvent(array $data)
    {
        if (isset($data['cover_image']) && $data['cover_image'] instanceof \Illuminate\Http\UploadedFile) {
            $data['cover_image'] = $data['cover_image']->store('event_covers', 'public');
        }

        return Event::create($data);
    }

    public function updateEvent(Event $event, array $data)
    {
        if (isset($data['cover_image']) && $data['cover_image'] instanceof \Illuminate\Http\UploadedFile) {
            if ($event->cover_image) {
                Storage::disk('public')->delete($event->cover_image);
            }
            $data['cover_image'] = $data['cover_image']->store('event_covers', 'public');
        }

        $event->update($data);
        return $event;
    }

    public function deleteEvent(Event $event)
    {
        if ($event->cover_image) {
            Storage::disk('public')->delete($event->cover_image);
        }
        $event->delete();
    }
}
