<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Guest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GuestController extends Controller
{
    public function index(Request $request)
    {
        $guests = Guest::whereHas('event', function($query) use ($request) {
            $query->where('user_id', $request->user()->id);
        })->get();
        return response()->json($guests);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'event_id' => 'required|exists:events,id',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'rsvp_status' => 'required|in:pending,confirmed,declined',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $event = \App\Models\Event::findOrFail($request->event_id);
        if ($event->status === 'completed') {
            return response()->json(['message' => 'Cannot add guests to a completed event.'], 422);
        }

        $guest = Guest::create($request->all());
        return response()->json($guest, 201);
    }

    public function update(Request $request, Guest $guest)
    {
        if ($guest->event->status === 'completed') {
            return response()->json(['message' => 'Cannot update guests of a completed event.'], 422);
        }

        $guest->update($request->all());
        return response()->json($guest);
    }

    public function destroy(Guest $guest)
    {
        if ($guest->event->status === 'completed') {
            return response()->json(['message' => 'Cannot remove guests from a completed event.'], 422);
        }

        $guest->delete();
        return response()->json(null, 204);
    }

    public function rsvpEmail(Request $request, Guest $guest)
    {
        if ($guest->event->user_id !== $request->user()->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($guest->event->status === 'completed') {
            return response()->json(['error' => 'Cannot send invitations for a completed event.'], 422);
        }

        if (!$guest->email) {
            return response()->json(['error' => 'Guest does not have a valid email address configured.'], 422);
        }

        // Simulate sending email
        \Illuminate\Support\Facades\Log::info("RSVP Invitation email simulated successfully to: {$guest->email} for Event: {$guest->event->title}");

        return response()->json([
            'message' => "RSVP email invitation sent successfully to {$guest->name} ({$guest->email})!"
        ]);
    }
}
